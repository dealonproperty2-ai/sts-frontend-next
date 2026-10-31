import { describe, expect, it } from 'vitest';
import { GET as listLetters, POST as createLetter } from '@/app/api/admin/experience-letters/route';
import { DELETE as deleteLetter, GET as getLetter, PATCH as patchLetter } from '@/app/api/admin/experience-letters/[id]/route';
import { connectDb } from '@/server/db';
import Employee from '@/server/models/Employee';
import ExperienceLetter from '@/server/models/ExperienceLetter';
import { createAdmin, ctx, makeRequest, read, tokenFor } from '../helpers';

const base = {
  salutation: 'Mr.', employeeName: 'Fauzan Ejaz', pronoun: 'he', designation: 'Frontend Developer Intern',
  joiningDate: '2023-01-02', endDate: '2023-06-02', issueDate: '2023-06-02', rating: 'satisfactory',
};
const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString('base64')}`;

async function setup() {
  await connectDb();
  return { token: tokenFor(await createAdmin()) };
}
const create = (token: string, body: object) => createLetter(makeRequest('/api/admin/experience-letters', { method: 'POST', token, body })).then(read);
const list = (token: string, params: Record<string, string> = {}) =>
  listLetters(makeRequest(`/api/admin/experience-letters?${new URLSearchParams(params)}`, { token })).then(read);
const patch = (token: string, id: string, body: object) => patchLetter(makeRequest(`/x/${id}`, { method: 'PATCH', token, body }), ctx({ id })).then(read);
const idOf = (r: { body: Record<string, unknown> | null }) => (r.body!.data as { _id: string })._id;

describe('experience letters API', () => {
  it('saves a letter and returns every field when reopened', async () => {
    const { token } = await setup();
    const r = await create(token, { ...base, rating: 'excellent', remarks: 'Led the **React** migration.', employeeCode: 'STS0042', showEmployeeCode: true, signatureMode: 'custom', signatureData: PNG });
    expect(r.status).toBe(201);
    const got = await getLetter(makeRequest('/x', { token }), ctx({ id: idOf(r) })).then(read);
    expect(got.body!.data).toMatchObject({
      employeeName: 'Fauzan Ejaz', designation: 'Frontend Developer Intern', rating: 'excellent', remarks: 'Led the **React** migration.',
      joiningDate: '2023-01-02T00:00:00.000Z', endDate: '2023-06-02T00:00:00.000Z', issueDate: '2023-06-02T00:00:00.000Z',
      employeeCode: 'STS0042', showEmployeeCode: true, signatureMode: 'custom', signatureData: PNG, logoMode: 'default',
    });
  });

  it('validates on the server and stores nothing invalid', async () => {
    const { token } = await setup();
    const r = await create(token, { ...base, employeeName: '', joiningDate: '2023-07-01', logoMode: 'custom', logoData: 'data:image/png;base64,PHN2Zz4=' });
    expect(r.status).toBe(400);
    expect(Object.keys(r.body!.fieldErrors as object)).toEqual(expect.arrayContaining(['employeeName', 'endDate', 'logoData']));
    expect((await create(token, { ...base, issueDate: '2023-05-01' })).status).toBe(400);
    expect((await create(token, { ...base, rating: 'awful' })).status).toBe(201); // unknown rating falls back to the default
    expect(await ExperienceLetter.countDocuments({ rating: 'satisfactory' })).toBe(1);
    expect((await createLetter(makeRequest('/x', { method: 'POST', token, body: '{bad' }))).status).toBe(400);
  });

  it('lists without image payloads, searches literally and paginates', async () => {
    const { token } = await setup();
    await create(token, { ...base, logoMode: 'custom', logoData: PNG });
    await create(token, { ...base, employeeName: 'Priya Sharma', salutation: 'Ms.', designation: 'UI/UX Designer (Remote)', department: 'Design', employeeCode: 'STS0099' });
    const all = await list(token);
    expect(all.body!.meta).toMatchObject({ total: 2 });
    expect((all.body!.data as Array<Record<string, unknown>>).every((l) => !('logoData' in l) && !('signatureData' in l))).toBe(true);
    expect((await list(token, { q: 'priya' })).body!.data).toHaveLength(1);
    expect((await list(token, { q: 'STS0099' })).body!.data).toHaveLength(1);
    expect((await list(token, { q: '(Remote)' })).body!.data).toHaveLength(1);
    expect((await list(token, { q: '.*' })).body!.data).toHaveLength(0);
    expect((await list(token, { limit: '1', page: '2' })).body!.data).toHaveLength(1);
  });

  it('edits keeping unsent fields, and rejects invalid edits', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    const r = await patch(token, id, { rating: 'very good', signatoryName: 'Naheed Zakia' });
    expect(r.status).toBe(200);
    expect(r.body!.data).toMatchObject({ rating: 'very good', signatoryName: 'Naheed Zakia', employeeName: 'Fauzan Ejaz', designation: 'Frontend Developer Intern' });
    expect((await patch(token, id, { endDate: '2022-01-01' })).status).toBe(400);
    expect((await ExperienceLetter.findById(id).lean())!.endDate.toISOString().slice(0, 10)).toBe('2023-06-02');
  });

  it('links an employee without modifying the employee record', async () => {
    const { token } = await setup();
    const emp = await Employee.create({ employeeId: 'STS0000091', name: 'Linked Person', designation: 'Developer', basicSalary: 1000 });
    const before = JSON.stringify(await Employee.findById(emp._id).lean());
    expect((await create(token, { ...base, employeeId: String(emp._id), employeeName: 'Linked Person' })).status).toBe(201);
    expect(JSON.stringify(await Employee.findById(emp._id).lean())).toBe(before);
    expect((await create(token, { ...base, employeeId: '0123456789abcdef01234567' })).status).toBe(400);
  });

  it('deletes, and answers 404/400 for unknown or malformed ids', async () => {
    const { token } = await setup();
    const id = idOf(await create(token, base));
    expect((await deleteLetter(makeRequest('/x', { method: 'DELETE', token }), ctx({ id }))).status).toBe(200);
    expect(await ExperienceLetter.countDocuments()).toBe(0);
    expect((await getLetter(makeRequest('/x', { token }), ctx({ id }))).status).toBe(404);
    expect((await getLetter(makeRequest('/x', { token }), ctx({ id: 'nope' }))).status).toBe(400);
  });
});
