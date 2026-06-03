// Shape shared by the Mongoose Course document and the static fallback below.
export interface CourseView {
  slug: string;
  icon: string;
  tag: string;
  title: string;
  dur: string;
  weeks: number;
  classes: number;
  stack: string;
  seats: number;
  price: string;
  priceInr: number;
  desc: string;
  longDesc: string;
  isActive: boolean;
  sortOrder: number;
}

// Canonical course catalog. The DB (seeded via `npm run seed:courses`) is the
// source of truth in production; this static copy is the fallback the course
// pages render when MongoDB is unavailable — e.g. local dev without MONGODB_URI,
// or a transient DB outage — so the Training pages never hard-crash.
export const COURSES: CourseView[] = [
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

export const CURRICULUM_WEBDEV = [
  {
    months: 'Month 1–2',
    title: 'HTML + CSS',
    sessions: '15 classes',
    topics: [
      'HTML basics, semantic tags & forms',
      'CSS box model, flex, grid, responsive',
      'Animations, variables, modern layouts',
      'Project: portfolio + landing page',
    ],
  },
  {
    months: 'Month 2–3',
    title: 'Bootstrap',
    sessions: '5 classes',
    topics: ['Grid system, components, utilities', 'Navbar, modal, carousel, cards', 'Project: marketing site clone'],
  },
  {
    months: 'Month 3–4',
    title: 'JavaScript',
    sessions: '24 classes',
    topics: [
      'Variables, types, control flow, loops',
      'DOM manipulation & events',
      'ES6+: arrow fns, spread, destructuring',
      'Async, promises, fetch, error handling',
      'Project: SPA with vanilla JS',
    ],
  },
  {
    months: 'Month 4–5',
    title: 'React',
    sessions: '24 classes',
    topics: [
      'Components, props, state, effects',
      'Hooks: custom, context, reducer',
      'Routing & forms',
      'State management (Zustand / Redux)',
      'Project: full app w/ auth',
    ],
  },
  {
    months: 'Month 5–6',
    title: 'Node + Express + DB',
    sessions: '24 classes',
    topics: ['Node basics & npm', 'Express, REST, middleware', 'PostgreSQL & MongoDB', 'Auth, JWT, sessions', 'Project: production API'],
  },
  {
    months: 'Month 6–7',
    title: 'Capstone + Deploy',
    sessions: '8 classes',
    topics: [
      'Pick a real project (1 of 4)',
      'Build front-to-back over 4 weeks',
      'Deploy to Vercel + Render',
      'Portfolio review & mock interviews',
    ],
  },
];
