import { describe, expect, it } from 'vitest';
import { GET as listLetters, POST as createLetter } from '@/app/api/admin/internship-letters/route';
import { DELETE as deleteLetter, GET as getLetter, PATCH as patchLetter } from '@/app/api/admin/internship-letters/[id]/route';
import { connectDb } from '@/server/db';
import Employee from '@/server/models/Employee';
import InternshipLetter from '@/server/models/InternshipLetter';
import { createAdmin, ctx, makeRequest, read, tokenFor } from '../helpers';

const base = {
  salutation: 'Mr.', internName: 'Zedan Ejaz', relation: 'S/o', guardianSalutation: 'Mr.', guardianName: 'Mohammed Ejaz Alam', pronoun: 'he',
  internshipType: 'Paid Internship', role: 'Software Developer Intern', startDate: '2026-01-05', endDate: '2026-06-30', letterDate: '2026-06-30',
  technologies: 'React.js, Next.js', performance: 'satisfactory',
};
const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString('base64')}`;

async function setup() {
  await connectDb();
  return { token: tokenFor(await createAdmin()) };
}
const create = (token: string, body: object) => createLetter(makeRequest('/api/admin/internship-letters', { method: 'POST', token, body })).then(read);
const list = (token: string, params: Record<string, string> = {}) =>
  listLetters(makeRequest(`/api/admin/internship-letters?${new URLSearchParams(params)}`, { token })).then(read);
const patch = (token: string, id: string, body: object) => patchLetter(makeRequest(`/x/${id}`, { method: 'PATCH', token, body }), ctx({ id })).then(read);
const idOf = (r: { body: Record<string, unknown> | null }) => (r.body!.data as { _id: string })._id;

describe('internship letters API', () => {
  it('saves a letter and returns every field when reopened', async () => {
    const { token } = await setup();
    const r = await create(token, { ...base, closingText: 'We wish **him** well.', logoMode: 'custom', logoData: PNG });
    expect(r.status).toBe(201);
    const got = await getLetter(makeRequest('/x', { token }), ctx({ id: idOf(r) })).then(read);
    expect(got.body!.data).toMatchObject({
      internName: 'Zedan Ejaz', guardianName: 'Mohammed Ejaz Alam', relation: 'S/o', role: 'Software Developer Intern',
      startDate: '2026-01-05T00:00:00.000Z', endDate: '2026-06-30T00:00:00.000Z', letterDate: '2026-06-30T00:00:00.000Z',
      closingText: 'We wish **him** well.', logoMode: 'custom', logoData: PNG, signatoryTitle: '',
    });
  });

  it('validates on the server and never stores invalid letters', async () => {
    const { token } = await setup();
    const r = await create(token, { ...base, internName: '', endDate: '2025-01-01', logoMode: 'custom', logoData: 'data:image/svg+xml;base64,PHN2Zz4=' });
    expect(r.status).toBe(400);
    expect(Object.keys(r.body!.fieldErrors as object)).toEqual(expect.arrayContaining(['internName', 'endDate', 'logoData']));
    expect(await InternshipLetter.countDocuments()).toBe(0);
    expect((await createLetter(makeRequest('/x', { method: 'POST', token, body: '{bad' }))).status).toBe(400);
    expect((await create(token, [] as unknown as object)).status).toBe(400);
  });

  it('lists without the logo payload, searches literally and paginates', async () => {
    const { token } = await setup();
    await create(token, { ...base, logoMode: 'custom', logoData: PNG });
    await create(token, { ...base, internName: 'Priya Sharma', salutation: 'Ms.', relation: 'D/o', role: 'UI/UX Designer Intern (Remote)', technologies: 'Figma' });
    const all = await list(token);
    expect(all.body!.meta).toMatchObject({ total: 2 });
    expect((all.body!.data as Array<Record<string, unknown>>).every((l) => !('logoData' in l))).toBe(true);
    expect((await list(token, { q: 'priya' })).body!.data).toHaveLength(1);
    expect((await list(token, { q: 'figma' })).body!.data).toHaveLength(1);
    expect((await list(token, { q: '(Remote)' })).body!.data).toHaveLength(1);
    expect((await list(token, { q: '.*' })).body!.data).toHaveLength(0);
    expect((await list(token, { limit: '1', page: '2' })).body!.data).toHaveLength(1);
  });

  it('edits a letter keeping fields that were not sent, and validates edits', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    const r = await patch(token, id, { performance: 'excellent', remarks: 'Great work.' });
    expect(r.status).toBe(200);
    expect(r.body!.data).toMatchObject({ performance: 'excellent', remarks: 'Great work.', internName: 'Zedan Ejaz', guardianName: 'Mohammed Ejaz Alam' });
    expect((await patch(token, id, { letterDate: '2026-01-01' })).status).toBe(400);
    expect((await InternshipLetter.findById(id).lean())!.letterDate.toISOString().slice(0, 10)).toBe('2026-06-30');
  });

  it('links an employee by snapshot without modifying the employee', async () => {
    const { token } = await setup();
    const emp = await Employee.create({ employeeId: 'STS0000091', name: 'Linked Intern', designation: 'Intern', basicSalary: 0 });
    const before = JSON.stringify(await Employee.findById(emp._id).lean());
    const r = await create(token, { ...base, employeeId: String(emp._id), internName: 'Linked Intern' });
    expect(r.body!.data).toMatchObject({ employeeCode: 'STS0000091' });
    expect(JSON.stringify(await Employee.findById(emp._id).lean())).toBe(before);
    expect((await create(token, { ...base, employeeId: '0123456789abcdef01234567' })).status).toBe(400);
  });

  it('deletes, and answers 404/400 for unknown or malformed ids', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    expect((await deleteLetter(makeRequest('/x', { method: 'DELETE', token }), ctx({ id }))).status).toBe(200);
    expect(await InternshipLetter.countDocuments()).toBe(0);
    expect((await getLetter(makeRequest('/x', { token }), ctx({ id }))).status).toBe(404);
    expect((await getLetter(makeRequest('/x', { token }), ctx({ id: 'nope' }))).status).toBe(400);
    expect((await patch(token, id, { remarks: 'x' })).status).toBe(404);
  });
});
