import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTINENTS, FLAGS, LIKE } from './data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const svgDir = path.join(__dirname, 'svg');

const errors = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

// 1. Total count: allow 242 or 243
assert(
  FLAGS.length === 242 || FLAGS.length === 243,
  `Expected 242 or 243 flags, got ${FLAGS.length}`
);

// 2. Check each flag
const seenCodes = new Set();
const seenNormEn = new Map();
const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const continentCounts = Object.fromEntries(CONTINENTS.map(k => [k, 0]));

for (const f of FLAGS) {
  // SVG exists
  const svgPath = path.join(svgDir, `${f.c}.svg`);
  assert(fs.existsSync(svgPath), `SVG for code ${f.c} not found at ${svgPath}`);

  // en and de non-empty
  assert(typeof f.en === 'string' && f.en.trim().length > 0, `Flag ${f.c} has empty en name`);
  assert(typeof f.de === 'string' && f.de.trim().length > 0, `Flag ${f.c} has empty de name`);

  // k in CONTINENTS
  assert(CONTINENTS.includes(f.k), `Flag ${f.c} has invalid continent ${f.k}`);
  if (continentCounts[f.k] !== undefined) continentCounts[f.k]++;

  // t integer 1-5
  assert(Number.isInteger(f.t) && f.t >= 1 && f.t <= 5, `Flag ${f.c} has invalid tier ${f.t}`);
  if (tierCounts[f.t] !== undefined) tierCounts[f.t]++;

  // c unique
  assert(!seenCodes.has(f.c), `Duplicate code: ${f.c}`);
  seenCodes.add(f.c);

  // no two flags share the same normalized en
  const normEn = f.en.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (seenNormEn.has(normEn)) {
    assert(false, `Duplicate normalized EN name: "${f.en}" (code: ${f.c}) conflicts with code ${seenNormEn.get(normEn)}`);
  }
  seenNormEn.set(normEn, f.c);
}

// Asserts tier 1 count is exactly 30
assert(tierCounts[1] === 30, `Expected exactly 30 tier-1 flags, got ${tierCounts[1]}`);

// Asserts every LIKE code exists
for (const group of LIKE) {
  for (const code of group) {
    assert(seenCodes.has(code), `LIKE code "${code}" does not exist in FLAGS`);
  }
}

if (errors.length > 0) {
  console.error('Check failed with errors:');
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log(`check ok, ${FLAGS.length} flags, 30 tier-1, 0 suspicious names.`);
console.log('Tier counts:', tierCounts);
console.log('Continent counts:', continentCounts);
