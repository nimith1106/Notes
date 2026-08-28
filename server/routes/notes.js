const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { load, save } = require('../store');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const { upload, UPLOAD_DIR } = require('../middleware/upload');
const { requireAdmin } = require('../middleware/admin');
const { slugify } = require('../utils/slug');

const router = express.Router();
const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

const VALID_TYPES = ['Notes', 'QuestionBank', 'PreviousPaper', 'Syllabus'];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function previewPage(title, body) {
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>'
    + '<style>body{font:16px/1.6 system-ui,sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#202124;background:#fff}'
    + '.slide{border:1px solid #ddd;border-radius:8px;padding:28px;margin:0 0 24px;min-height:120px;box-shadow:0 2px 8px #0001}'
    + 'h1{font-size:24px}p{white-space:pre-wrap}</style></head><body>' + body + '</body></html>';
}

function pptxPreview(filePath, title) {
  const zip = new AdmZip(filePath);
  const slides = zip.getEntries()
    .filter(entry => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName))
    .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }))
    .map((entry, index) => {
      const xml = entry.getData().toString('utf8');
      const text = [...xml.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g)]
        .map(match => match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
        .join('\n');
      return '<section class="slide"><h1>Slide ' + (index + 1) + '</h1><p>'
        + escapeHtml(text || '(No readable text on this slide)') + '</p></section>';
    });
  return previewPage(title, slides.join('') || '<p>No readable slides found.</p>');
}

// In-memory cache of all notes, kept in sync with the JSON file on disk.
let notes = load();

function persist() {
  save(notes);
}

function toApi(n) {
  return {
    id: n.id,
    sem: n.sem,
    subjectName: n.subjectName,
    subjectCode: n.subjectCode || '',
    type: n.type,
    title: n.title,
    originalName: n.originalName,
    size: n.size,
    addedAt: n.addedAt,
    favorite: !!n.favorite,
    viewedAt: n.viewedAt || null
  };
}

function cleanupFiles(files) {
  (files || []).forEach(f => fs.unlink(f.path, () => {}));
}

// Removes a folder if it's now empty (e.g. after moving/deleting its last file).
function cleanupEmptyDir(absDir) {
  fs.readdir(absDir, (err, items) => {
    if (err) return;
    if (items.length === 0) fs.rmdir(absDir, () => {});
  });
}

// Moves an existing note's file into the folder matching its current subject,
// used when a subject name/code is edited so files stay grouped correctly.
function relocateFileIfNeeded(note) {
  const subjectKey = (note.subjectCode && note.subjectCode.trim()) || note.subjectName || 'uncategorized';
  const targetFolder = slugify(subjectKey);
  const currentFolder = path.dirname(note.filePath); // relative, e.g. "maths"

  if (currentFolder === targetFolder) return;

  const oldAbsPath = path.join(UPLOAD_DIR, note.filePath);
  const newAbsDir = path.join(UPLOAD_DIR, targetFolder);
  fs.mkdirSync(newAbsDir, { recursive: true });

  const fileName = path.basename(note.filePath);
  const newRelPath = path.join(targetFolder, fileName);
  const newAbsPath = path.join(UPLOAD_DIR, newRelPath);

  try {
    fs.renameSync(oldAbsPath, newAbsPath);
    note.filePath = newRelPath;
    cleanupEmptyDir(path.join(UPLOAD_DIR, currentFolder));
  } catch (e) {
    console.error('Could not move file to new subject folder:', e.message);
  }
}

// GET /api/notes — list all notes, or filter with query params
router.get('/', (req, res) => {
  const { sem, type, favorite, q } = req.query;
  let result = notes.slice();

  if (sem) result = result.filter(n => n.sem === sem);
  if (type && VALID_TYPES.includes(type)) result = result.filter(n => n.type === type);
  if (favorite === 'true') result = result.filter(n => n.favorite);
  if (q) {
    const ql = q.toLowerCase();
    result = result.filter(n =>
      n.subjectName.toLowerCase().includes(ql) ||
      (n.subjectCode || '').toLowerCase().includes(ql) ||
      n.title.toLowerCase().includes(ql)
    );
  }

  result.sort((a, b) => b.addedAt - a.addedAt);
  res.json(result.map(toApi));
});

// GET /api/notes/stats — total note count and total storage used
router.get('/stats', (req, res) => {
  const count = notes.length;
  const totalSize = notes.reduce((sum, n) => sum + (n.size || 0), 0);
  res.json({ count, totalSize });
});

// POST /api/notes — upload one or more documents (bulk supported via "files" field)
// Multer's destination callback (see middleware/upload.js) already places
// each file inside uploads/<subject-slug>/ based on the submitted subject.
router.post('/', upload.array('files', 20), (req, res) => {
  const { sem, subjectName, subjectCode, type, title } = req.body;

  if (!sem || !subjectName) {
    cleanupFiles(req.files);
    return res.status(400).json({ error: 'sem and subjectName are required' });
  }
  const noteType = VALID_TYPES.includes(type) ? type : 'Notes';
  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ error: 'At least one supported document file is required' });
  }

  const created = [];
  const now = Date.now();

  files.forEach((file, idx) => {
    const id = crypto.randomUUID();
    const noteTitle = files.length === 1 && title ? title : file.originalname.replace(/\.(pdf|docx?)$/i, '');
    const record = {
      id,
      sem,
      subjectName,
      subjectCode: subjectCode || '',
      type: noteType,
      title: noteTitle,
      filePath: path.relative(UPLOAD_DIR, file.path), // e.g. "maths/<uuid>.pdf"
      originalName: file.originalname,
      size: file.size,
      addedAt: now + idx, // keep stable, distinct ordering for bulk uploads
      favorite: false,
      viewedAt: null
    };
    notes.push(record);
    created.push(toApi(record));
  });

  persist();
  res.status(201).json(created);
});

// PUT /api/notes/:id — update metadata, optionally replace the file.
// If the subject changes, the file is moved into the matching subject folder.
router.put('/:id', requireAdmin, upload.single('file'), (req, res) => {
  const existing = notes.find(n => n.id === req.params.id);
  if (!existing) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: 'Note not found' });
  }

  const { subjectName, subjectCode, type, title } = req.body;
  const noteType = VALID_TYPES.includes(type) ? type : existing.type;
  const oldFolder = path.dirname(existing.filePath);

  if (req.file) {
    // New file was already saved by multer into the folder matching the
    // *new* subject (since subject fields are sent before the file field).
    const oldAbsPath = path.join(UPLOAD_DIR, existing.filePath);
    fs.unlink(oldAbsPath, () => cleanupEmptyDir(path.join(UPLOAD_DIR, oldFolder)));
    existing.filePath = path.relative(UPLOAD_DIR, req.file.path);
    existing.originalName = req.file.originalname;
    existing.size = req.file.size;
  }

  existing.subjectName = subjectName || existing.subjectName;
  existing.subjectCode = subjectCode !== undefined ? subjectCode : existing.subjectCode;
  existing.type = noteType;
  existing.title = title || existing.title;

  // No new file was uploaded, but the subject may have changed — move the
  // existing file into the correct folder so it stays grouped correctly.
  if (!req.file) {
    relocateFileIfNeeded(existing);
  }

  persist();
  res.json(toApi(existing));
});

// POST /api/notes/:id/favorite — toggle favorite
router.post('/:id/favorite', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  note.favorite = !note.favorite;
  persist();
  res.json(toApi(note));
});

// POST /api/notes/:id/view — mark as viewed (for "recently viewed")
router.post('/:id/view', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  note.viewedAt = Date.now();
  persist();
  res.json(toApi(note));
});

// GET /api/notes/:id/preview — render office documents as same-origin HTML
router.get('/:id/preview', async (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).send('Note not found');

  const filePath = path.join(UPLOAD_DIR, note.filePath);
  if (!fs.existsSync(filePath)) return res.status(404).send('File missing on server');

  const extension = path.extname(filePath).toLowerCase();
  try {
    if (extension === '.docx') {
      const result = await mammoth.convertToHtml({ path: filePath });
      return res.type('html').send(previewPage(note.title, result.value));
    }
    if (extension === '.doc') {
      const document = await new WordExtractor().extract(filePath);
      return res.type('html').send(previewPage(note.title, '<p>' + escapeHtml(document.getBody()) + '</p>'));
    }
    if (extension === '.pptx') {
      return res.type('html').send(pptxPreview(filePath, note.title));
    }
    if (extension === '.ppt') {
      return res.type('html').send(previewPage(note.title,
        '<h1>PowerPoint preview unavailable</h1><p>This legacy PPT file can be downloaded and opened in PowerPoint or LibreOffice.</p>'));
    }
    return res.status(415).send('This file type does not need a document preview');
  } catch (error) {
    console.error('Could not preview document:', error.message);
    return res.status(500).send(previewPage(note.title, '<h1>Preview unavailable</h1><p>Download the file to open it in a compatible application.</p>'));
  }
});

// GET /api/notes/:id/file — stream the document inline (for the in-page viewer)
router.get('/:id/file', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const filePath = path.join(UPLOAD_DIR, note.filePath);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on server' });

  res.setHeader('Content-Type', MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(note.originalName) + '"');
  fs.createReadStream(filePath).pipe(res);
});

// GET /api/notes/:id/download — force download
router.get('/:id/download', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const filePath = path.join(UPLOAD_DIR, note.filePath);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on server' });

  const extension = path.extname(note.originalName).toLowerCase() || '.pdf';
  res.download(filePath, note.title.replace(/[^a-z0-9\-_ ]/gi, '').trim() + extension);
});

// DELETE /api/notes/:id
router.delete('/:id', requireAdmin, (req, res) => {
  const idx = notes.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Note not found' });

  const [removed] = notes.splice(idx, 1);
  persist();

  const filePath = path.join(UPLOAD_DIR, removed.filePath);
  const folder = path.dirname(filePath);
  fs.unlink(filePath, () => cleanupEmptyDir(folder));

  res.json({ deleted: true });
});

module.exports = router;
