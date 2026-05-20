// Run once to create the first admin user:
//   node scripts/seed-admin.mjs
//
// Change email/password below before running.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stsdb';

const ADMIN_EMAIL    = 'admin@steptosoft.com';
const ADMIN_PASSWORD = 'Admin@1234';
const ADMIN_NAME     = 'Super Admin';

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
  console.log('Connected to MongoDB:', MONGO_URI);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log('Admin already exists:', ADMIN_EMAIL);
    process.exit(0);
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: hash, role: 'admin', isActive: true });

  console.log('');
  console.log('✅  Admin created successfully');
  console.log('   Email   :', ADMIN_EMAIL);
  console.log('   Password:', ADMIN_PASSWORD);
  console.log('');
  console.log('👉  Login at http://localhost:3000/admin/login');
  console.log('   Change your password after first login.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
