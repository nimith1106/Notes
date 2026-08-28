// Simple JSON-file-backed data store — no native compilation required,
// so `npm install` works on any machine without build tools installed.
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'notestudio-data.json');

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return []; // file doesn't exist yet, or is empty/corrupt — start fresh
  }
}

function save(notes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2), 'utf-8');
}

module.exports = { load, save, DATA_FILE };
