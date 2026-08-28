// Turns a subject name/code into a filesystem-safe folder name.
// e.g. "Data Structures" -> "data-structures", "CS 201" -> "cs-201"
function slugify(str) {
  const slug = (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'subject';
}

module.exports = { slugify };
