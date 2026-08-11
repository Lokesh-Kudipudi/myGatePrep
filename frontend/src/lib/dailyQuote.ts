import quotes from '../data/gitaQuotes.json';

export interface GitaQuote {
  chapter: number;
  verse: number;
  reference: string;
  sanskrit: string;
  direct_translation: string;
  meaning: string;
}

const DAY_MS = 86_400_000;
const QUOTE_EPOCH = Date.UTC(2026, 7, 11);
const gitaQuotes = quotes as GitaQuote[];

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffledIndexes(length: number, cycle: number) {
  const indexes = Array.from({ length }, (_, index) => index);
  const random = seededRandom(Math.imul(cycle + 1, 0x9e3779b1));

  for (let index = length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }

  return indexes;
}

function localDayIndex(date: Date) {
  const localDateAsUtc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  return Math.floor((localDateAsUtc - QUOTE_EPOCH) / DAY_MS);
}

export function getDailyQuote(date = new Date()): GitaQuote {
  const day = localDayIndex(date);
  const cycle = Math.floor(day / gitaQuotes.length);
  const position = ((day % gitaQuotes.length) + gitaQuotes.length) % gitaQuotes.length;
  const order = shuffledIndexes(gitaQuotes.length, cycle);
  return gitaQuotes[order[position]];
}
