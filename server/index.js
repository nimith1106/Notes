require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const notesRouter = require('./routes/notes');
const { isAdminRequest } = require('./middleware/admin');

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || (!isProduction && !allowedOrigins.length)) {
      return callback(null, true);
    }
    callback(new Error('Origin not allowed'));
  },
  allowedHeaders: ['Content-Type', 'x-admin-password']
}));
app.use(express.json());

app.use('/api/notes', notesRouter);

app.get('/api/admin/status', (req, res) => {
  res.json({ admin: isAdminRequest(req) });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the frontend as static files
const CLIENT_DIR = path.join(__dirname, '..', 'client');
app.use(express.static(CLIENT_DIR));
app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

// Multer / general error handler (keeps JSON errors instead of HTML crash pages)
app.use((err, req, res, next) => {
  if (err) {
    const status = err.message === 'Only PDF, DOC, DOCX, PPT, and PPTX files are allowed' ? 400
      : err.code === 'LIMIT_FILE_SIZE' ? 413
      : 500;
    return res.status(status).json({ error: err.message || 'Server error' });
  }
  next();
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`NoteStudio server listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
