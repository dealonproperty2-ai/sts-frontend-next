// Seed the 6 default courses into MongoDB.
// Safe to re-run — uses upsert so existing records are updated, not duplicated.
//
//   node scripts/seed-courses.mjs
//   MONGODB_URI=mongodb+srv://... node scripts/seed-courses.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stsdb';

const CourseSchema = new mongoose.Schema(
  {
    slug:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon:     { type: String, required: true, default: 'code' },
    tag:      { type: String, required: true, enum: ['Flagship', 'Cohort', 'Specialist'], default: 'Cohort' },
    title:    { type: String, required: true },
    dur:      { type: String, required: true },
    weeks:    { type: Number, required: true, min: 1 },
    classes:  { type: Number, required: true, min: 1 },
    stack:    { type: String, required: true },
    seats:    { type: Number, required: true, min: 1 },
    price:    { type: String, required: true },
    priceInr: { type: Number, required: true, min: 0 },
    desc:     { type: String, required: true },
    longDesc: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    sortOrder:{ type: Number, default: 0 },
  },
  { timestamps: true }
);

const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);

const COURSES = [
  {
    slug: 'webdev',
    icon: 'code',
    tag: 'Flagship',
    title: 'Full-Stack Web Development',
    dur: '7 months · 120 classes',
    weeks: 28,
    classes: 120,
    stack: 'HTML · CSS · JS · React · Node · DB',
    seats: 24,
    price: '₹35,000',
    priceInr: 35000,
    desc: 'The flagship bootcamp. Zero to job-ready full-stack developer in seven months. Live cohorts, real projects, 1-on-1 mentor.',
    longDesc: 'Seven months. 120 classes. Three real projects. The complete journey from your first <html> tag to deploying a full-stack app under your own domain.',
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: 'frontend',
    icon: 'layers',
    tag: 'Cohort',
    title: 'Frontend Engineering',
    dur: '4 months · 60 classes',
    weeks: 16,
    classes: 60,
    stack: 'HTML · CSS · JS · React · Next.js',
    seats: 20,
    price: '₹22,000',
    priceInr: 22000,
    desc: 'Deep dive on the modern frontend. Build production-grade UIs, state, routing, performance, and ship to Vercel.',
    longDesc: 'A four-month deep dive on the modern frontend. State, routing, accessibility, performance, and shipping to production.',
    isActive: true,
    sortOrder: 2,
  },
  {
    slug: 'backend',
    icon: 'cube',
    tag: 'Cohort',
    title: 'Backend & APIs',
    dur: '4 months · 56 classes',
    weeks: 16,
    classes: 56,
    stack: 'Node · Express · Postgres · Redis',
    seats: 18,
    price: '₹24,000',
    priceInr: 24000,
    desc: 'Backend engineering from first principles. Auth, rate limits, queues, caching, and a real production API.',
    longDesc: 'Backend engineering from first principles to a production API with auth, jobs, caching, and rate limiting.',
    isActive: true,
    sortOrder: 3,
  },
  {
    slug: 'angular',
    icon: 'cpu',
    tag: 'Specialist',
    title: 'Angular for Enterprise',
    dur: '3 months · 40 classes',
    weeks: 12,
    classes: 40,
    stack: 'Angular · RxJS · NgRx',
    seats: 16,
    price: '₹20,000',
    priceInr: 20000,
    desc: 'Enterprise Angular: forms, RxJS, state, modules, lazy routing, and shipping to a production CI/CD.',
    longDesc: 'Enterprise Angular — forms, RxJS, state, modules, lazy routing, and CI/CD.',
    isActive: true,
    sortOrder: 4,
  },
  {
    slug: 'devops',
    icon: 'cloud',
    tag: 'Specialist',
    title: 'Cloud & DevOps',
    dur: '3 months · 40 classes',
    weeks: 12,
    classes: 40,
    stack: 'AWS · Docker · K8s · Terraform',
    seats: 16,
    price: '₹26,000',
    priceInr: 26000,
    desc: 'From zero to deploying production workloads on AWS. IaC, containers, K8s, observability.',
    longDesc: 'From zero to production on AWS — IaC, containers, K8s, observability.',
    isActive: true,
    sortOrder: 5,
  },
  {
    slug: 'qa',
    icon: 'shield',
    tag: 'Specialist',
    title: 'Software QA & Automation',
    dur: '3 months · 36 classes',
    weeks: 12,
    classes: 36,
    stack: 'Playwright · Cypress · k6',
    seats: 14,
    price: '₹18,000',
    priceInr: 18000,
    desc: 'Manual + automated testing. Build a test suite from scratch, integrate with CI, and report like a pro.',
    longDesc: 'Manual + automated testing — build a test suite from scratch, integrate with CI, and report like a pro.',
    isActive: true,
    sortOrder: 6,
  },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  let created = 0;
  let updated = 0;

  for (const course of COURSES) {
    const result = await Course.findOneAndUpdate(
      { slug: course.slug },
      { $set: course },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const wasNew = result.createdAt.getTime() === result.updatedAt.getTime();
    if (wasNew) {
      created++;
      console.log(`  ✅ Created: ${course.slug}`);
    } else {
      updated++;
      console.log(`  ♻️  Updated: ${course.slug}`);
    }
  }

  console.log('');
  console.log(`Done. ${created} created, ${updated} updated.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
