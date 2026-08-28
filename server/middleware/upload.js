const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { slugify } = require('../utils/slug');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100MB per document

// Files are grouped on disk by subject: uploads/<subject-slug>/<uuid>.<ext>
// The subject code is preferred over the name when both are given, since
// it's the more stable identifier (e.g. won't change if a name is retyped
// slightly differently).
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subjectKey = (req.body.subjectCode && req.body.subjectCode.trim())
      || req.body.subjectName
      || 'uncategorized';
    const folder = path.join(UPLOAD_DIR, slugify(subjectKey));
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const id = crypto.randomUUID();
    cb(null, id + path.extname(file.originalname).toLowerCase());
  }
});

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx']);

function documentFileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return cb(new Error('Only PDF, DOC, DOCX, PPT, and PPTX files are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_FILE_BYTES }
});

module.exports = { upload, UPLOAD_DIR, MAX_FILE_BYTES };
