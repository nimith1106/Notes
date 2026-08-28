const bcrypt = require('bcryptjs');
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

function isAdminRequest(req) {
  const password = req.get('x-admin-password');
  return Boolean(ADMIN_PASSWORD_HASH && password) && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
}

function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: 'Owner access required' });
  }
  next();
}

module.exports = { isAdminRequest, requireAdmin };
