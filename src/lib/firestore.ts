import { Timestamp } from 'firebase/firestore';

export function dateToIso(v: unknown): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return new Date(v).toISOString();
  return new Date().toISOString();
}

export function metroKey(displayCity: string): string {
  const first = displayCity.split(',')[0].trim().toLowerCase();
  let token = first;
  if (token.startsWith('the ')) token = token.substring(4);
  const nyc = new Set([
    'new york',
    'new york city',
    'nyc',
    'manhattan',
    'brooklyn',
    'queens',
    'bronx',
    'staten island',
  ]);
  if (nyc.has(token)) return 'new york';
  return first;
}
