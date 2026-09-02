const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  sem: { type: String, required: true },
  subjectName: { type: String, required: true },
  subjectCode: { type: String, default: '' },
  type: {
    type: String,
    enum: ['Notes', 'QuestionBank', 'PreviousPaper', 'Syllabus'],
    default: 'Notes'
  },
  title: { type: String, required: true },
  filePath: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, default: 0 },
  addedAt: { type: Number, default: Date.now },
  favorite: { type: Boolean, default: false },
  viewedAt: { type: Number, default: null }
}, {
  collection: 'notes'
});

module.exports = mongoose.model('Note', noteSchema);
