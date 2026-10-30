import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const flagsDir = __dirname;
const svgDir = path.join(flagsDir, 'svg');

const pkgDir = process.argv[2] || 'C:/Users/matti/AppData/Local/Temp/claude/C--Users-matti/eb02d8b9-76c9-4b4a-8b39-f8d8498e2665/scratchpad/fi/package';

if (!fs.existsSync(pkgDir)) {
  console.error(`Flag icons package directory not found: ${pkgDir}`);
  process.exit(1);
}

const countryJsonPath = path.join(pkgDir, 'country.json');
const countryData = JSON.parse(fs.readFileSync(countryJsonPath, 'utf8'));

// 1. Filter entries
const extraCodes = new Set(['xk', 'gb-eng', 'gb-sct', 'gb-wls', 'gb-nir', 'eu', 'un']);
const dropCodes = new Set(['bv', 'sj', 'hm', 'um', 'mf', 'bl', 'gp', 'mq', 'gf', 're', 'yt', 'pm', 'wf']);

const kept = countryData.filter(e => (e.iso === true || extraCodes.has(e.code)) && !dropCodes.has(e.code));

// 2. Names
const enDisplay = new Intl.DisplayNames(['en'], { type: 'region' });
const deDisplay = new Intl.DisplayNames(['de'], { type: 'region' });

const overrides = {
  hk: ['Hong Kong', 'Hongkong'],
  mo: ['Macau', 'Macau'],
  mm: ['Myanmar', 'Myanmar'],
  ps: ['Palestine', 'Palästina'],
  cc: ['Cocos Islands', 'Kokosinseln'],
  tr: ['Turkey', 'Türkei'],
  cd: ['Democratic Republic of the Congo', 'Demokratische Republik Kongo'],
  cg: ['Republic of the Congo', 'Republik Kongo'],
  cv: ['Cape Verde', 'Kap Verde'],
  cz: ['Czechia', 'Tschechien'],
  sz: ['Eswatini', 'Eswatini'],
  mk: ['North Macedonia', 'Nordmazedonien'],
  ci: ['Ivory Coast', 'Elfenbeinküste'],
  'gb-eng': ['England', 'England'],
  'gb-sct': ['Scotland', 'Schottland'],
  'gb-wls': ['Wales', 'Wales'],
  'gb-nir': ['Northern Ireland', 'Nordirland'],
  xk: ['Kosovo', 'Kosovo'],
  eu: ['European Union', 'Europäische Union'],
  un: ['United Nations', 'Vereinte Nationen']
};

export const CONTINENTS = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
  'Antarctica',
  'World'
];

// 4. Territories
const territoryCodes = new Set(
  'ai aq as aw ax bm bq cc ck cw cx eh fk fo gg gi gl gs gu hk im io je ky mo mp ms nc nf nu pf pn pr sh sx tc tf tk vg vi gb-eng gb-sct gb-wls gb-nir eu un'.split(' ')
);

// 5. Tiers
const t1Codes = new Set(
  'us gb fr de it es ca mx br ar au cn jp in ru za eg tr gr nl ch se no pt pl ie kr cu nz jm'.split(' ')
);
const t2Codes = new Set(
  'dk fi at be ua ro hu cz sk hr rs bg is lt lv ee il sa ae ir iq pk bd th vn id my ph sg kp cl co pe ve ec uy py bo ng ke et gh ma dz tn sn cm ug tz ci lb jo cy mt lu af np lk cr pa do ht tw eu un gb-eng gb-sct gb-wls'.split(' ')
);
const t4Codes = new Set(
  'ad mc li sm va mh fm pw nr tv ki sb vu ws to km st cv gw gq dj er sc mu mv bn tl bt kg tj tm kn lc vc gd dm ag bb bs bz sr gy lr sl gm bi rw ss so ls sz mw bf ne td cf ml mr ga cg cd gn tg bj mk me ba xk ps aq gb-nir mo'.split(' ')
);
const t3TerritoryCodes = new Set('hk gl pr fo'.split(' '));

function getTier(code, isSov) {
  if (t1Codes.has(code)) return 1;
  if (t2Codes.has(code)) return 2;
  if (t4Codes.has(code)) return 4;
  if (t3TerritoryCodes.has(code)) return 3;
  return isSov ? 3 : 5;
}

// 6. Aliases
const rawAliases = {
  us: ['USA', 'America', 'United States of America', 'Vereinigte Staaten von Amerika'],
  gb: ['UK', 'Great Britain', 'Britain', 'United Kingdom', 'Großbritannien'],
  ae: ['UAE', 'Emirates', 'VAE'],
  cz: ['Czech Republic', 'Tschechische Republik'],
  tr: ['Türkiye', 'Turkiye'],
  mm: ['Burma'],
  ci: ['Cote d\'Ivoire', 'Côte d’Ivoire'],
  cd: ['DRC', 'DR Congo', 'Congo Kinshasa'],
  cg: ['Congo', 'Congo Brazzaville'],
  sz: ['Swaziland'],
  mk: ['Macedonia', 'Makedonien'],
  cv: ['Cabo Verde'],
  tl: ['East Timor', 'Timor-Leste'],
  kr: ['South Korea', 'Korea', 'Südkorea'],
  kp: ['North Korea', 'Nordkorea'],
  ru: ['Russia', 'Russland'],
  va: ['Vatican', 'Holy See', 'Vatikan', 'Vatikanstadt'],
  nl: ['Holland', 'Netherlands', 'Niederlande'],
  de: ['Deutschland'],
  ps: ['Palestinian Territories'],
  hk: ['Hongkong'],
  mo: ['Macao'],
  fm: ['Micronesia', 'Mikronesien'],
  bs: ['The Bahamas'],
  gm: ['The Gambia'],
  fk: ['Falklands'],
  tw: ['Republic of China'],
  eu: ['EU', 'Europe', 'Europa'],
  un: ['UN', 'UNO'],
  sh: ['St Helena']
};

// 7. LIKE groups verbatim
export const LIKE = [
  ['td', 'ro', 'ad', 'md'],
  ['id', 'mc', 'pl'],
  ['ie', 'it', 'ci', 'mx'],
  ['nl', 'lu'],
  ['ru', 'si', 'sk', 'rs', 'hr'],
  ['no', 'is', 'fo', 'dk', 'se', 'fi'],
  ['au', 'nz', 'fj', 'tv', 'ck'],
  ['us', 'lr', 'my'],
  ['cu', 'pr', 'cz'],
  ['gb', 'ky', 'bm', 'vg', 'fk', 'ai', 'ms', 'tc', 'sh', 'gs', 'io', 'pn'],
  ['ve', 'co', 'ec'],
  ['bd', 'jp', 'pw'],
  ['sn', 'ml', 'gn', 'cm', 'gh', 'et', 'bo', 'gw'],
  ['tn', 'tr'],
  ['pk', 'dz', 'mr'],
  ['sy', 'iq', 'ye', 'eg', 'ly', 'sd'],
  ['ae', 'kw', 'jo', 'ps', 'eh'],
  ['lv', 'at', 'pe'],
  ['ch', 'to', 'ge'],
  ['bg', 'hu', 'it'],
  ['de', 'be'],
  ['ni', 'sv', 'hn', 'gt', 'ar'],
  ['gr', 'uy'],
  ['th', 'cr']
];

// Ensure svg folder exists
fs.mkdirSync(svgDir, { recursive: true });

const flags = [];
const suspicious = [];

for (const e of kept) {
  const code = e.code.toLowerCase();
  let en = '';
  let de = '';

  if (overrides[code]) {
    [en, de] = overrides[code];
  } else {
    try {
      en = enDisplay.of(code.toUpperCase());
    } catch {
      en = e.name;
    }
    try {
      de = deDisplay.of(code.toUpperCase());
    } catch {
      de = en;
    }
    en = en.replaceAll(' & ', ' and ').replaceAll('St. ', 'Saint ');
  }

  // Continent
  let k = e.continent;
  if (['gb-eng', 'gb-sct', 'gb-wls', 'gb-nir', 'xk', 'eu'].includes(code)) {
    k = 'Europe';
  } else if (code === 'un') {
    k = 'World';
  } else if (code === 'aq') {
    k = 'Antarctica';
  }

  if (!k || !CONTINENTS.includes(k)) {
    throw new Error(`Continent for ${code} is undefined or invalid: ${k}`);
  }

  const sov = !territoryCodes.has(code);
  const t = getTier(code, sov);

  // Aliases
  let al = rawAliases[code] ? [...rawAliases[code]] : [];
  al = al.filter(alias => alias.toLowerCase() !== en.toLowerCase() && alias.toLowerCase() !== de.toLowerCase());

  if (en.includes('&') || en.includes('(') || en.includes('SAR') || en.includes(' - ')) {
    suspicious.push({ code, en });
  }

  flags.push({ c: code, en, de, k, t, sov, al });

  // 8. Copy SVG
  const srcSvg = path.join(pkgDir, 'flags', '4x3', `${code}.svg`);
  const destSvg = path.join(svgDir, `${code}.svg`);
  if (!fs.existsSync(srcSvg)) {
    throw new Error(`Source SVG not found: ${srcSvg}`);
  }
  fs.copyFileSync(srcSvg, destSvg);
}

// Copy LICENSE
const srcLicense = path.join(pkgDir, 'LICENSE');
const destLicense = path.join(svgDir, 'LICENSE-flag-icons.txt');
if (fs.existsSync(srcLicense)) {
  fs.copyFileSync(srcLicense, destLicense);
}

if (suspicious.length > 0) {
  console.warn('Suspicious EN names found:', suspicious);
} else {
  console.log('0 suspicious names.');
}

// Sort by en
flags.sort((a, b) => a.en.localeCompare(b.en, 'en'));

// 9. Write flags/data.js
const dataFileContent = `// generated by gen-data.mjs, do not edit
export const CONTINENTS = ${JSON.stringify(CONTINENTS)};
export const FLAGS = [
${flags.map(f => `  ${JSON.stringify(f)},`).join('\n')}
];
export const LIKE = ${JSON.stringify(LIKE, null, 2)};
`;

fs.writeFileSync(path.join(flagsDir, 'data.js'), dataFileContent, 'utf8');
console.log(`Generated flags/data.js with ${flags.length} flags.`);
