// Creates the first admin user in the production database.
// Reads credentials from .env.local automatically.
//
//   npm run seed:admin
//
// To update an existing admin's password, set UPDATE=true:
//   UPDATE=true npm run seed:admin

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const bcrypt  = require('bcryptjs');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌  MONGODB_URI is not set.');
  console.error('    Run via: npm run seed:admin  (loads .env.local automatically)');
  process.exit(1);
}

// ── Credentials ──────────────────────────────────────────────────────────────
// Edit these before running, then revert before committing.
const ADMIN_EMAIL    = 'admin@steptosoft.com';
const ADMIN_PASSWORD = 'Admin@12344';
const ADMIN_NAME     = 'Super Admin';
// ─────────────────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name:     { type: String,  default: '' },
  email:    { type: String,  required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String,  default: '' },
  password: { type: String,  required: true },
  role:     { type: String,  default: 'user' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function main() {
  await mongoose.connect(MONGO_URI);
  const host = new URL(MONGO_URI).host;
  console.log('Connected to MongoDB:', host);

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

  if (existing && process.env.UPDATE !== 'true') {
    console.log('⚠️   Admin already exists:', ADMIN_EMAIL);
    console.log('    To reset the password run: UPDATE=true npm run seed:admin');
    process.exit(0);
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  if (existing) {
    await User.updateOne({ _id: existing._id }, { $set: { password: hash, name: ADMIN_NAME } });
    console.log('');
    console.log('✅  Admin password updated');
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL.toLowerCase(), password: hash, role: 'admin', isActive: true });
    console.log('');
    console.log('✅  Admin created successfully');
  }

  console.log('   Email   :', ADMIN_EMAIL);
  console.log('   Host    :', host);
  console.log('');
  console.log('👉  Login at /admin/login — change your password after first login.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
