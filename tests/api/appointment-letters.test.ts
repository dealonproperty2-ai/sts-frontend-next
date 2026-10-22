import { describe, expect, it } from 'vitest';
import { POST as createLetter } from '@/app/api/admin/appointment-letters/route';
import { GET as getLetter, PATCH as patchLetter } from '@/app/api/admin/appointment-letters/[id]/route';
import { connectDb } from '@/server/db';
import Employee from '@/server/models/Employee';
import { createAdmin, ctx, makeRequest, read, tokenFor } from '../helpers';

async function setup() {
  await connectDb();
  const admin = await createAdmin();
  const emp = await Employee.create({ employeeId: 'STS0000077', name: 'Letter Test', designation: 'Analyst' });
  return { token: tokenFor(admin), empId: String(emp._id) };
}
const baseBody = (empId: string) => ({
  employeeId: empId, offerDate: '2026-10-05', joiningDate: '2026-11-03', designation: 'Data Analyst', salary: 15000,
});

describe('appointment letter API — interview date and salutation', () => {
  it('stores both on create and returns them with the full employee', async () => {
    const { token, empId } = await setup();
    const created = await read(await createLetter(makeRequest('/api/admin/appointment-letters', {
      method: 'POST', token, body: { ...baseBody(empId), interviewDate: '2026-10-01', salutation: 'Mr.' },
    })));
    expect(created.status).toBe(201);
    const id = (created.body!.data as { _id: string })._id;

    const got = await read(await getLetter(makeRequest(`/api/admin/appointment-letters/${id}`, { token }), ctx({ id })));
    const data = got.body!.data as Record<string, unknown>;
    expect(String(data.interviewDate).slice(0, 10)).toBe('2026-10-01');
    expect(data.salutation).toBe('Mr.');
    expect((data.employeeId as { name: string }).name).toBe('Letter Test');
  });

  it('defaults to "not set" when omitted, and ignores invalid values', async () => {
    const { token, empId } = await setup();
    const a = await read(await createLetter(makeRequest('/x', { method: 'POST', token, body: baseBody(empId) })));
    expect(a.body!.data).toMatchObject({ interviewDate: null, salutation: '' });
    const b = await read(await createLetter(makeRequest('/x', {
      method: 'POST', token, body: { ...baseBody(empId), interviewDate: 'not-a-date', salutation: 'Dr.' },
    })));
    expect(b.status).toBe(201);
    expect(b.body!.data).toMatchObject({ interviewDate: null, salutation: '' });
  });

  it('stores, updates and clears the acceptance date and place per letter', async () => {
    const { token, empId } = await setup();
    const mk = (body: object) => createLetter(makeRequest('/x', { method: 'POST', token, body: { ...baseBody(empId), ...body } })).then(read);
    const a = await mk({ acceptanceDate: '2026-10-22', acceptancePlace: '  Dhanbad   City ' });
    const b = await mk({ acceptanceDate: '2026-11-02', acceptancePlace: 'Asansol' });
    const c = await mk({});
    const field = (r: Awaited<ReturnType<typeof mk>>, k: string) => (r.body!.data as Record<string, unknown>)[k];
    expect(String(field(a, 'acceptanceDate')).slice(0, 10)).toBe('2026-10-22');
    expect(field(a, 'acceptancePlace')).toBe('Dhanbad City');
    expect(String(field(b, 'acceptanceDate')).slice(0, 10)).toBe('2026-11-02');
    expect(field(b, 'acceptancePlace')).toBe('Asansol');
    expect(c.body!.data).toMatchObject({ acceptanceDate: null, acceptancePlace: '' });

    // Each saved letter keeps its own values.
    const idA = (a.body!.data as { _id: string })._id;
    const gotA = await read(await getLetter(makeRequest(`/x/${idA}`, { token }), ctx({ id: idA })));
    expect(gotA.body!.data).toMatchObject({ acceptancePlace: 'Dhanbad City' });

    const patch = (body: unknown) => patchLetter(makeRequest(`/x/${idA}`, { method: 'PATCH', token, body }), ctx({ id: idA })).then(read);
    let r = await patch({ acceptanceDate: '2026-12-01', acceptancePlace: ' Kolkata ' });
    expect(r.body!.data).toMatchObject({ acceptancePlace: 'Kolkata' });
    expect(String((r.body!.data as Record<string, unknown>).acceptanceDate).slice(0, 10)).toBe('2026-12-01');
    r = await patch({ acceptanceDate: '', acceptancePlace: '' });
    expect(r.body!.data).toMatchObject({ acceptanceDate: null, acceptancePlace: '' });
    r = await patch({ acceptanceDate: 'garbage', acceptancePlace: { $ne: '' } });
    expect(r.body!.data).toMatchObject({ acceptanceDate: null, acceptancePlace: '' });
  });

  it('PATCH sets, changes and clears them without producing Invalid Date', async () => {
    const { token, empId } = await setup();
    const c = await read(await createLetter(makeRequest('/x', { method: 'POST', token, body: baseBody(empId) })));
    const id = (c.body!.data as { _id: string })._id;
    const patch = (body: unknown) => patchLetter(makeRequest(`/x/${id}`, { method: 'PATCH', token, body }), ctx({ id })).then(read);

    let r = await patch({ interviewDate: '2026-09-30', salutation: 'Ms.' });
    expect(String((r.body!.data as Record<string, unknown>).interviewDate).slice(0, 10)).toBe('2026-09-30');
    expect((r.body!.data as Record<string, unknown>).salutation).toBe('Ms.');

    r = await patch({ interviewDate: '', salutation: '<script>' });
    expect(r.body!.data).toMatchObject({ interviewDate: null, salutation: '' });
  });
});
