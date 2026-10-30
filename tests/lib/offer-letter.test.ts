import { describe, expect, it } from 'vitest';
import {
  buildOfferLetter, canTransition, formatOfferNumber, isDeadlinePassed, normalizeOfferInput, validateAcceptance, validateOfferInput,
  OFFER_STATUSES, OFFER_TRANSITIONS, type OfferLetterInput,
} from '@/lib/offerLetter';
import { COMPANY_ADDRESS } from '@/lib/hrConstants';

const raw = {
  salutation: 'Ms.', candidateName: '  Priya   Test Sharma ', candidateEmail: 'Priya.Test@Example.com', candidatePhone: '+91 90000 00011',
  candidateAddress: ' Flat 2C \n\n Test Road \n', department: 'Engineering', designation: 'Software Developer', employmentType: 'Full-time',
  workLocation: '', reportingManager: 'Engineering Manager', joiningDate: '2026-12-01', issueDate: '2026-10-27', validUntil: '2026-11-10',
  monthlyGross: '30000', basicSalary: '15000', hra: '7500', specialAllowance: '7500', annualCtc: '381600',
  benefits: 'Group health insurance.', incentives: '', probationPeriod: '3 (Three) months', workingHours: '9:30 AM to 6:30 PM', additionalTerms: '', hrName: '',
};
const good = () => normalizeOfferInput(raw);
const runsText = (r: { text: string }[]) => r.map((x) => x.text).join('');
const allText = (i: OfferLetterInput) => {
  const c = buildOfferLetter(i);
  return [c.salutation, ...c.sections.flatMap((s) => [runsText(s.heading), ...s.paragraphs.map(runsText), ...(s.table ?? []).map((t) => `${t.label} ${t.value}`)]), c.closing, runsText(c.acceptance)].join('\n');
};

describe('normalizeOfferInput', () => {
  it('trims, collapses whitespace, lower-cases email and parses numbers and dates', () => {
    const i = good();
    expect(i.candidateName).toBe('Priya Test Sharma');
    expect(i.candidateEmail).toBe('priya.test@example.com');
    expect(i.candidateAddress).toBe('Flat 2C\nTest Road');
    expect(i.monthlyGross).toBe(30000);
    expect(i.annualCtc).toBe(381600);
    expect(i.hrName).toBe('Naheed Zakia');
  });

  it('treats an empty CTC as "not defined" (null), never as 0', () => {
    expect(normalizeOfferInput({ ...raw, annualCtc: '' }).annualCtc).toBeNull();
  });

  it('rejects junk employee ids, salutations and dates instead of storing them', () => {
    const i = normalizeOfferInput({ ...raw, employeeId: { $ne: null }, salutation: 'Dr.', joiningDate: 'tomorrow' });
    expect(i.employeeId).toBeNull();
    expect(i.salutation).toBe('');
    expect(i.joiningDate).toBe('');
  });
});

describe('validateOfferInput', () => {
  it('accepts a complete, consistent offer', () => {
    expect(validateOfferInput(good())).toEqual({});
  });

  it('requires the essentials', () => {
    const e = validateOfferInput(normalizeOfferInput({}));
    for (const k of ['candidateName', 'department', 'designation', 'employmentType', 'issueDate', 'joiningDate', 'validUntil', 'monthlyGross']) {
      expect(e[k], k).toBeTruthy();
    }
  });

  it('checks email, phone and date ordering', () => {
    const e = validateOfferInput(normalizeOfferInput({ ...raw, candidateEmail: 'nope', candidatePhone: '12ab', joiningDate: '2026-10-01', validUntil: '2026-10-01' }));
    expect(e.candidateEmail).toMatch(/valid email/);
    expect(e.candidatePhone).toMatch(/valid phone/);
    expect(e.joiningDate).toMatch(/before the issue date/);
    expect(e.validUntil).toMatch(/before the issue date/);
  });

  it('requires salary components (when given) to add up to the monthly gross', () => {
    expect(validateOfferInput(normalizeOfferInput({ ...raw, hra: '7000' })).salaryComponents).toMatch(/must equal/);
    expect(validateOfferInput(normalizeOfferInput({ ...raw, basicSalary: '', hra: '', specialAllowance: '' }))).toEqual({});
  });

  it('validates the optional acceptance date and place', () => {
    const v = (over: Record<string, unknown>) => validateOfferInput(normalizeOfferInput({ ...raw, ...over }), { ...raw, ...over });
    expect(v({ acceptanceDate: '', acceptancePlace: '' })).toEqual({});
    expect(v({ acceptanceDate: '2026-10-29', acceptancePlace: 'Asansol' })).toEqual({});
    expect(v({ acceptanceDate: '2026-10-01' }).acceptanceDate).toMatch(/before the offer issue date/);
    expect(v({ acceptanceDate: 'not-a-date' }).acceptanceDate).toMatch(/valid acceptance date/);
    expect(v({ acceptancePlace: '<script>' }).acceptancePlace).toMatch(/valid place/);
    expect(v({ acceptancePlace: '12345' }).acceptancePlace).toMatch(/valid place/);
    expect(v({ acceptancePlace: 'Bardhaman (Purba), West Bengal' })).toEqual({});
    expect(normalizeOfferInput({ acceptancePlace: 'x'.repeat(300) }).acceptancePlace).toHaveLength(100);
    expect(validateAcceptance({ acceptanceDate: '2026-10-29', acceptancePlace: '', issueDate: '' })).toEqual({});
  });

  it('rejects negative or non-numeric money and a zero CTC', () => {
    const e = validateOfferInput(normalizeOfferInput({ ...raw, monthlyGross: '-5', hra: 'abc', annualCtc: '0' }));
    expect(e.monthlyGross).toBeTruthy();
    expect(e.hra).toBeTruthy();
    expect(e.annualCtc).toBeTruthy();
  });
});

describe('status workflow', () => {
  it('allows only the defined transitions', () => {
    expect(canTransition('draft', 'sent')).toBe(true);
    expect(canTransition('draft', 'revoked')).toBe(true);
    expect(canTransition('draft', 'accepted')).toBe(false);
    for (const to of ['accepted', 'declined', 'expired', 'revoked'] as const) expect(canTransition('sent', to)).toBe(true);
    expect(canTransition('sent', 'draft')).toBe(false);
  });

  it('makes accepted, declined, expired and revoked final', () => {
    for (const s of ['accepted', 'declined', 'expired', 'revoked'] as const) {
      expect(OFFER_TRANSITIONS[s]).toEqual([]);
      for (const to of OFFER_STATUSES) expect(canTransition(s, to)).toBe(false);
    }
  });

  it('only treats a deadline as passed after the day itself', () => {
    expect(isDeadlinePassed('2026-11-10', '2026-11-10')).toBe(false);
    expect(isDeadlinePassed('2026-11-10', '2026-11-11')).toBe(true);
    expect(isDeadlinePassed('2026-11-10T00:00:00.000Z', '2026-11-11')).toBe(true);
    expect(isDeadlinePassed('', '2026-11-11')).toBe(false);
  });
});

describe('offer numbers', () => {
  it('follow STS/HR/OL/<year>/<4-digit sequence>', () => {
    expect(formatOfferNumber(2026, 7)).toBe('STS/HR/OL/2026/0007');
    expect(formatOfferNumber(2026, 12345)).toBe('STS/HR/OL/2026/12345');
  });
});

describe('buildOfferLetter', () => {
  it('builds the letter structure with the candidate data', () => {
    const c = buildOfferLetter(good());
    expect(c.issueDate).toBe('27-Oct-2026');
    expect(c.recipient).toEqual({ name: 'Priya Test Sharma', addressLines: ['Flat 2C', 'Test Road'], email: 'priya.test@example.com', phone: '+91 90000 00011' });
    expect(c.salutation).toBe('Dear Ms. Priya Test Sharma');
    expect(c.sections.map((s) => runsText(s.heading))).toEqual([
      '1. OFFER OF EMPLOYMENT:', '2. POSITION AND DEPARTMENT:', '3. PLACE OF WORK:', '4. PROPOSED DATE OF JOINING:',
      '5. COMPENSATION AND BENEFITS:', '6. PROBATION:', '7. WORKING HOURS AND REPORTING:', '8. OFFER VALIDITY AND ACCEPTANCE:',
      '9. CONDITIONS OF THIS OFFER:',
    ]);
    expect(c.signatory).toEqual({ name: 'Mrs. Naheed Zakia', designation: 'HR' });
  });

  it('carries no reference number or watermark in the letter content', () => {
    const c = buildOfferLetter(good()) as unknown as Record<string, unknown>;
    expect(c).not.toHaveProperty('offerNumber');
    expect(c).not.toHaveProperty('watermark');
    expect(JSON.stringify(c)).not.toMatch(/STS\/HR\/OL|Ref:|DRAFT/);
  });

  it('shows compensation clearly in Indian format, keeping gross and CTC distinct', () => {
    const t = allText(good());
    expect(t).toContain('Monthly Gross Salary Rs. 30,000/-');
    expect(t).toContain('Annual Gross Salary (12 × monthly gross) Rs. 3,60,000/-');
    expect(t).toContain('Annual Cost to Company (CTC) Rs. 3,81,600/-');
    expect(allText(normalizeOfferInput({ ...raw, annualCtc: '' }))).not.toContain('Cost to Company');
    expect(t).not.toMatch(/in-hand|take-home/i);
  });

  it('numbers sections consecutively when optional ones are omitted', () => {
    const i = normalizeOfferInput({ ...raw, probationPeriod: '', workingHours: '', reportingManager: '' });
    const heads = buildOfferLetter(i).sections.map((s) => runsText(s.heading));
    expect(heads).toEqual(['1. OFFER OF EMPLOYMENT:', '2. POSITION AND DEPARTMENT:', '3. PLACE OF WORK:', '4. PROPOSED DATE OF JOINING:',
      '5. COMPENSATION AND BENEFITS:', '6. OFFER VALIDITY AND ACCEPTANCE:', '7. CONDITIONS OF THIS OFFER:']);
  });

  it('uses the company address when no work location is given, and dates in long form', () => {
    const t = allText(good());
    expect(t).toContain(`Your place of work will be ${COMPANY_ADDRESS}.`);
    expect(t).toContain('Your proposed date of joining is 01-December-2026.');
    expect(t).toContain('This offer is valid until 10-November-2026.');
  });

  it('adds admin-entered terms as plain text, never markup', () => {
    const terms = '<b>Relocation</b> & joining bonus';
    const c = buildOfferLetter(normalizeOfferInput({ ...raw, additionalTerms: terms }));
    const last = c.sections[c.sections.length - 1];
    expect(runsText(last.heading)).toBe('10. ADDITIONAL TERMS:');
    expect(last.paragraphs).toEqual([[{ text: terms }]]);
  });

  it('has a grammatical acceptance statement (no double full stop)', () => {
    const t = runsText(buildOfferLetter(good()).acceptance);
    expect(t).toBe('I, Priya Test Sharma, have read and understood the terms of this offer and accept the offer of employment as Software Developer with STEP TO SOFT Pvt. Ltd.');
  });

  it('renders the saved acceptance date as DD-MM-YYYY and the place, independent of other dates', () => {
    const c = buildOfferLetter(normalizeOfferInput({ ...raw, acceptanceDate: '2026-10-29', acceptancePlace: '  Asansol ' }));
    expect(c.acceptanceDate).toBe('29-10-2026');
    expect(c.acceptancePlace).toBe('Asansol');
    expect(c.issueDate).toBe('27-Oct-2026');
  });

  it('leaves acceptance date/place empty when not recorded (older offers) — never the issue or joining date', () => {
    const { acceptanceDate, acceptancePlace, ...older } = good();
    void acceptanceDate; void acceptancePlace;
    const c = buildOfferLetter(normalizeOfferInput(older));
    expect(c.acceptanceDate).toBe('');
    expect(c.acceptancePlace).toBe('');
  });

  it('never renders HTML entities or undefined values', () => {
    const t = allText(normalizeOfferInput({ ...raw, reportingManager: '', benefits: '', incentives: '' }));
    expect(t).not.toMatch(/&amp;|&#\d+;|undefined|null|NaN/);
  });
});
