import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_HEXES = new Set([
  '#283891', // clinic owner primary brand
  '#1e2b70', // clinic owner hover
  '#1e3a8a', // brand-primary
  '#172554', // brand-primary-hover
  '#0d9488', // brand-teal
  '#005c5f', // deep teal
  '#00484a', // deep teal hover
  '#0f766e', // brand-teal-hover
  '#0284c7', // brand-accent
  '#f1f5f9', // neutral canvas
  '#ffffff', // white
  '#000000', // black
  '#e11d48', // rose-600 SVG
  '#d97706', // amber-600 SVG
  '#059669', // emerald-600 SVG
  '#10b981', // emerald-500 SVG
  '#333333', // print border
]);

const SRC_DIR = path.resolve('src');
let violations = 0;

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(full);
    } else if (/\.(jsx?|css)$/.test(entry.name) && entry.name !== 'App.css') {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const matches = line.matchAll(/#([0-9a-fA-F]{6})/g);
        for (const match of matches) {
          const hex = match[0].toLowerCase();
          if (!ALLOWED_HEXES.has(hex)) {
            console.error(`Forbidden hex ${hex} in ${path.relative('.', full)}:${idx + 1}`);
            violations++;
          }
        }
      });
    }
  }
}

scan(SRC_DIR);
if (violations > 0) {
  console.error(`\n❌ Failed with ${violations} forbidden hex literal(s). Consult design.md.`);
  process.exit(1);
} else {
  console.log('✅ Design system token lint passed: 0 forbidden hex literals found.');
}

