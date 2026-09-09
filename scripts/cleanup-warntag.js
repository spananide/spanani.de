const fs = require('fs');
const path = require('path');

const candidates = [
  path.resolve(__dirname, '..', 'clock', 'index.html'),
  path.resolve(process.cwd(), 'clock', 'index.html'),
  path.resolve(__dirname, 'clock', 'index.html')
];

let clockFile = candidates.find(p => fs.existsSync(p));
if (!clockFile) {
  console.error('Could not find clock/index.html');
  process.exit(1);
}

let content = fs.readFileSync(clockFile, 'utf8');

// 1. Remove Warntag CSS
content = content.replace(/\/\* --- WARNTAG SPECIAL COUNTDOWN --- \*\/[\s\S]*?(?=\n@media\(max-width:768px\)\{)/, '');
content = content.replace(/\s*\.wt-card\{margin-bottom:18px\}[\s\S]*?\.wt-grid\{grid-template-columns:1fr 1fr\}/, '');

// 2. Remove Warntag HTML card
content = content.replace(/\s*<!-- WARNTAG 2026 SPECIAL COUNTDOWN -->[\s\S]*?<\/div>\s*<\/div>\s*(?=\n\s*<div class="istrip">)/, '\n');

// 3. Remove updWarntag call in tick()
content = content.replace(/\s*updWarntag\(ts\);/, '');

// 4. Remove Warntag JS logic
content = content.replace(/\s*\/\/ --- BUNDESWEITER WARNTAG 2026 LOGIC ---[\s\S]*?\/\/ --- END BUNDESWEITER WARNTAG 2026 LOGIC ---\s*/, '\n\n');

fs.writeFileSync(clockFile, content, 'utf8');
console.log('Successfully cleaned up Warntag code from ' + clockFile);
