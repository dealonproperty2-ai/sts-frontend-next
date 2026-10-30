import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

describe('OfferLetter model registration', () => {
  it('replaces a stale cached model (dev hot reload) so new fields are not stripped on save', async () => {
    // Simulate the dev server: a model compiled from an OLDER schema is still registered.
    if (mongoose.models.OfferLetter) mongoose.deleteModel('OfferLetter');
    mongoose.model('OfferLetter', new mongoose.Schema({ candidateName: String }));
    vi.resetModules();

    const { default: OfferLetter } = await import('@/server/models/OfferLetter');
    expect(OfferLetter.schema.path('acceptanceDate')).toBeTruthy();
    expect(OfferLetter.schema.path('acceptancePlace')).toBeTruthy();

    const cast = (OfferLetter.findOneAndUpdate({}, { $set: { acceptanceDate: new Date('2026-10-29'), acceptancePlace: 'Asansol' } }) as unknown as {
      _castUpdate: (u: unknown) => { $set: Record<string, unknown> }; _update: unknown;
    });
    expect(cast._castUpdate(cast._update).$set).toMatchObject({ acceptancePlace: 'Asansol' });
  });
});
