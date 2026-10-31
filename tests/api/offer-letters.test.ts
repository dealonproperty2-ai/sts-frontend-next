import { describe, expect, it } from 'vitest';
import { GET as listOffers, POST as createOffer } from '@/app/api/admin/offer-letters/route';
import { DELETE as deleteOffer, GET as getOffer, PATCH as patchOffer } from '@/app/api/admin/offer-letters/[id]/route';
import { POST as setStatus } from '@/app/api/admin/offer-letters/[id]/status/route';
import { connectDb } from '@/server/db';
import Employee from '@/server/models/Employee';
import OfferLetter from '@/server/models/OfferLetter';
import { todayLocalISO } from '@/lib/offerLetter';
import { createAdmin, ctx, makeRequest, read, tokenFor } from '../helpers';

const base = {
  salutation: 'Ms.', candidateName: 'Priya Test Sharma', candidateEmail: 'priya.test@example.com', candidatePhone: '+91 90000 00011',
  candidateAddress: 'Flat 2C\nTest Road', department: 'Engineering', designation: 'Software Developer', employmentType: 'Full-time',
  joiningDate: '2026-12-01', issueDate: '2026-10-27', validUntil: '2026-11-10',
  monthlyGross: 30000, basicSalary: 15000, hra: 7500, specialAllowance: 7500, annualCtc: 381600, probationPeriod: '3 (Three) months',
};

async function setup() {
  await connectDb();
  return { token: tokenFor(await createAdmin()) };
}
const create = (token: string, body: object) => createOffer(makeRequest('/api/admin/offer-letters', { method: 'POST', token, body })).then(read);
const list = (token: string, params: Record<string, string> = {}) =>
  listOffers(makeRequest(`/api/admin/offer-letters?${new URLSearchParams(params)}`, { token })).then(read);
const status = (token: string, id: string, s: string) =>
  setStatus(makeRequest(`/x/${id}/status`, { method: 'POST', token, body: { status: s } }), ctx({ id })).then(read);
const idOf = (r: { body: Record<string, unknown> | null }) => (r.body!.data as { _id: string })._id;
const year = new Date().getFullYear();

describe('offer letters — create', () => {
  it('creates a draft with the next offer number and a status history entry', async () => {
    const { token } = await setup();
    const a = await create(token, base);
    const b = await create(token, { ...base, candidateName: 'Second Candidate' });
    expect(a.status).toBe(201);
    expect(a.body!.data).toMatchObject({ status: 'draft', offerNumber: `STS/HR/OL/${year}/0001`, candidateName: 'Priya Test Sharma' });
    expect((b.body!.data as { offerNumber: string }).offerNumber).toBe(`STS/HR/OL/${year}/0002`);
    expect((a.body!.data as { statusHistory: unknown[] }).statusHistory).toHaveLength(1);
  });

  it('never assigns the same number twice under concurrent creation', async () => {
    const { token } = await setup();
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => create(token, { ...base, candidateName: `Concurrent ${i}` })));
    expect(results.every((r) => r.status === 201)).toBe(true);
    const numbers = results.map((r) => (r.body!.data as { offerNumber: string }).offerNumber);
    expect(new Set(numbers).size).toBe(6);
  });

  it('validates on the server and reports field errors', async () => {
    const { token } = await setup();
    const r = await create(token, { ...base, candidateName: '', monthlyGross: 0, hra: 7000, validUntil: '2026-01-01' });
    expect(r.status).toBe(400);
    expect(Object.keys(r.body!.fieldErrors as object)).toEqual(expect.arrayContaining(['candidateName', 'monthlyGross', 'validUntil']));
    expect(await OfferLetter.countDocuments()).toBe(0);
  });

  it('links an existing employee by snapshot without modifying the employee record', async () => {
    const { token } = await setup();
    const emp = await Employee.create({ employeeId: 'STS0000077', name: 'Linked Person', designation: 'Analyst', basicSalary: 10000 });
    const before = JSON.stringify(await Employee.findById(emp._id).lean());
    const r = await create(token, { ...base, employeeId: String(emp._id), candidateName: 'Linked Person' });
    expect(r.status).toBe(201);
    expect(r.body!.data).toMatchObject({ employeeCode: 'STS0000077' });
    expect(JSON.stringify(await Employee.findById(emp._id).lean())).toBe(before);
    expect(await Employee.countDocuments()).toBe(1);

    const missing = await create(token, { ...base, employeeId: '0123456789abcdef01234567' });
    expect(missing.status).toBe(400);
  });

  it('rejects non-JSON and array bodies', async () => {
    const { token } = await setup();
    expect((await createOffer(makeRequest('/x', { method: 'POST', token, body: '{bad' }))).status).toBe(400);
    expect((await create(token, [] as unknown as object)).status).toBe(400);
  });
});

describe('offer letters — list, search, filters', () => {
  async function seed(token: string) {
    await create(token, base);
    await create(token, { ...base, candidateName: 'Rahul Example', department: 'Design', designation: 'UI/UX Designer' });
    const c = await create(token, { ...base, candidateName: 'Meera (Contract)', employmentType: 'Contract' });
    await status(token, idOf(c), 'sent');
  }

  it('searches by candidate name, offer number and email', async () => {
    const { token } = await setup();
    await seed(token);
    expect((await list(token, { q: 'rahul' })).body!.data).toHaveLength(1);
    expect((await list(token, { q: `OL/${year}/0002` })).body!.data).toHaveLength(1);
    expect((await list(token, { q: 'priya.test@' })).body!.data).toHaveLength(3);
  });

  it('treats regex characters in the search literally', async () => {
    const { token } = await setup();
    await seed(token);
    const r = await list(token, { q: '(Contract)' });
    expect(r.status).toBe(200);
    expect(r.body!.data).toHaveLength(1);
    expect((await list(token, { q: '.*' })).body!.data).toHaveLength(0);
  });

  it('filters by department, designation and status and returns facets', async () => {
    const { token } = await setup();
    await seed(token);
    expect((await list(token, { department: 'Design' })).body!.data).toHaveLength(1);
    expect((await list(token, { designation: 'Software Developer' })).body!.data).toHaveLength(2);
    expect((await list(token, { status: 'sent' })).body!.data).toHaveLength(1);
    const all = await list(token);
    expect(all.body!.facets).toEqual({ departments: ['Design', 'Engineering'], designations: ['Software Developer', 'UI/UX Designer'] });
    expect((await list(token, { status: 'bogus' })).status).toBe(400);
  });

  it('paginates', async () => {
    const { token } = await setup();
    await seed(token);
    const p1 = await list(token, { limit: '2', page: '1' });
    const p2 = await list(token, { limit: '2', page: '2' });
    expect(p1.body!.meta).toMatchObject({ total: 3, pages: 2, page: 1 });
    expect(p1.body!.data).toHaveLength(2);
    expect(p2.body!.data).toHaveLength(1);
    expect((await list(token, { page: 'abc', limit: 'xyz' })).status).toBe(200);
  });
});

describe('offer letters — view, edit, delete', () => {
  it('returns one offer, 404 for unknown and 400 for malformed ids', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    expect((await getOffer(makeRequest(`/x/${id}`, { token }), ctx({ id }))).status).toBe(200);
    expect((await getOffer(makeRequest('/x', { token }), ctx({ id: '0123456789abcdef01234567' }))).status).toBe(404);
    expect((await getOffer(makeRequest('/x', { token }), ctx({ id: 'nope' }))).status).toBe(400);
  });

  it('edits a draft, keeping fields that were not sent', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    const r = await read(await patchOffer(makeRequest(`/x/${id}`, { method: 'PATCH', token, body: { designation: 'Senior Software Developer' } }), ctx({ id })));
    expect(r.status).toBe(200);
    expect(r.body!.data).toMatchObject({ designation: 'Senior Software Developer', candidateName: 'Priya Test Sharma', monthlyGross: 30000, annualCtc: 381600 });
    expect((r.body!.data as { offerNumber: string }).offerNumber).toBe(`STS/HR/OL/${year}/0001`);
  });

  it('cannot change offer number or status through edit, and rejects invalid edits', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    const r = await read(await patchOffer(makeRequest(`/x/${id}`, { method: 'PATCH', token, body: { offerNumber: 'HACK', status: 'accepted' } }), ctx({ id })));
    expect(r.body!.data).toMatchObject({ offerNumber: `STS/HR/OL/${year}/0001`, status: 'draft' });
    const bad = await patchOffer(makeRequest(`/x/${id}`, { method: 'PATCH', token, body: { monthlyGross: -1 } }), ctx({ id }));
    expect(bad.status).toBe(400);
  });

  it('freezes an offer once sent (no edits, no delete)', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    await status(token, id, 'sent');
    const edit = await patchOffer(makeRequest(`/x/${id}`, { method: 'PATCH', token, body: { designation: 'Changed' } }), ctx({ id }));
    expect(edit.status).toBe(409);
    expect((await deleteOffer(makeRequest(`/x/${id}`, { method: 'DELETE', token }), ctx({ id }))).status).toBe(409);
    expect((await OfferLetter.findById(id).lean())!.designation).toBe('Software Developer');
  });

  it('deletes drafts', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    expect((await deleteOffer(makeRequest(`/x/${id}`, { method: 'DELETE', token }), ctx({ id }))).status).toBe(200);
    expect(await OfferLetter.countDocuments()).toBe(0);
  });
});

describe('offer letters — acceptance date and place', () => {
  const patch = (token: string, id: string, body: object) =>
    patchOffer(makeRequest(`/x/${id}`, { method: 'PATCH', token, body }), ctx({ id })).then(read);
  const get = (token: string, id: string) => getOffer(makeRequest(`/x/${id}`, { token }), ctx({ id })).then(read);

  it('persists them on a draft and returns them when the offer is reopened', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, { ...base, acceptanceDate: '2026-10-29', acceptancePlace: ' Asansol ' }));
    const r = await get(token, id);
    expect(r.body!.data).toMatchObject({ acceptanceDate: '2026-10-29T00:00:00.000Z', acceptancePlace: 'Asansol', status: 'draft' });
    const cleared = await patch(token, id, { acceptanceDate: '', acceptancePlace: '' });
    expect(cleared.body!.data).toMatchObject({ acceptanceDate: null, acceptancePlace: '' });
  });

  it('can be recorded on a sent or accepted offer without changing its status or content', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    await status(token, id, 'sent');
    const r = await patch(token, id, { acceptanceDate: '2026-10-29', acceptancePlace: 'Asansol' });
    expect(r.status).toBe(200);
    expect(r.body!.data).toMatchObject({ status: 'sent', acceptancePlace: 'Asansol', designation: 'Software Developer', monthlyGross: 30000 });
    await status(token, id, 'accepted');
    const r2 = await patch(token, id, { acceptancePlace: 'Kolkata' });
    expect(r2.body!.data).toMatchObject({ status: 'accepted', acceptancePlace: 'Kolkata', acceptanceDate: '2026-10-29T00:00:00.000Z' });
  });

  it('still refuses any other change to an issued offer, and acceptance edits on void offers', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    await status(token, id, 'sent');
    expect((await patch(token, id, { acceptancePlace: 'Asansol', monthlyGross: 99999 })).status).toBe(409);
    expect((await OfferLetter.findById(id).lean())!.monthlyGross).toBe(30000);
    await status(token, id, 'revoked');
    expect((await patch(token, id, { acceptancePlace: 'Asansol' })).status).toBe(409);
  });

  it('validates them on the server', async () => {
    const { token } = await setup();
    const r = await create(token, { ...base, acceptanceDate: '2026-10-01', acceptancePlace: '<b>x</b>' });
    expect(r.status).toBe(400);
    expect(Object.keys(r.body!.fieldErrors as object)).toEqual(expect.arrayContaining(['acceptanceDate', 'acceptancePlace']));
    const id = idOf(await create(token, base));
    await status(token, id, 'sent');
    expect((await patch(token, id, { acceptanceDate: 'garbage' })).status).toBe(400);
  });

  it('keeps working for older offers stored without the fields', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    await OfferLetter.collection.updateOne({ _id: new (await import('mongoose')).Types.ObjectId(id) }, { $unset: { acceptanceDate: '', acceptancePlace: '' } });
    const raw = await OfferLetter.collection.findOne({});
    expect(raw).not.toHaveProperty('acceptancePlace');
    const r = await patch(token, id, { designation: 'Senior Software Developer' });
    expect(r.status).toBe(200);
    expect(r.body!.data).toMatchObject({ designation: 'Senior Software Developer', acceptanceDate: null, acceptancePlace: '' });
  });
});

describe('offer letters — status workflow', () => {
  it('follows draft → sent → accepted and records history', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    expect((await status(token, id, 'sent')).status).toBe(200);
    const acc = await status(token, id, 'accepted');
    expect(acc.status).toBe(200);
    expect((acc.body!.data as { statusHistory: Array<{ status: string }> }).statusHistory.map((h) => h.status)).toEqual(['draft', 'sent', 'accepted']);
  });

  it('rejects skipping steps and changing final states', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    expect((await status(token, id, 'accepted')).status).toBe(409);
    await status(token, id, 'revoked');
    for (const s of ['sent', 'accepted', 'draft']) expect((await status(token, id, s)).status).toBe(409);
    expect((await status(token, id, 'bogus')).status).toBe(400);
  });

  it('allows "expired" only after the acceptance deadline', async () => {
    const { token } = await setup();
    const future = await create(token, { ...base, issueDate: todayLocalISO(), validUntil: '2099-01-01', joiningDate: '2099-01-01' });
    await status(token, idOf(future), 'sent');
    expect((await status(token, idOf(future), 'expired')).status).toBe(409);

    const past = await create(token, { ...base, issueDate: '2020-01-01', validUntil: '2020-01-15', joiningDate: '2020-02-01' });
    await status(token, idOf(past), 'sent');
    expect((await status(token, idOf(past), 'expired')).status).toBe(200);
  });

  it('lets only one of two concurrent status changes win', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    await status(token, id, 'sent');
    const [a, b] = await Promise.all([status(token, id, 'accepted'), status(token, id, 'declined')]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });
});
