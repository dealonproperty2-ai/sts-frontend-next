// Indian numbering system: ones → thousands → lakhs → crores
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function toWords(n: number): string {
  if (n === 0) return '';
  if (n < 20)  return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  if (n < 1_000)     return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
  if (n < 1_00_000)  return toWords(Math.floor(n / 1_000)) + ' Thousand' + (n % 1_000 ? ' ' + toWords(n % 1_000) : '');
  if (n < 1_00_00_000) return toWords(Math.floor(n / 1_00_000)) + ' Lakh' + (n % 1_00_000 ? ' ' + toWords(n % 1_00_000) : '');
  return toWords(Math.floor(n / 1_00_00_000)) + ' Crore' + (n % 1_00_00_000 ? ' ' + toWords(n % 1_00_00_000) : '');
}

export function numberToWordsINR(amount: number): string {
  if (!isFinite(amount) || amount < 0) return '';
  const rounded = Math.round(amount);
  if (rounded === 0) return 'INR Zero only';
  return 'INR ' + toWords(rounded).trim() + ' only';
}
