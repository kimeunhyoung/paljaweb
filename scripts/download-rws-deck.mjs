/**
 * Download Rider–Waite–Smith (Geldard / YarnSpinnerTool) scans from Wikimedia Commons,
 * resize for web, save under public/tarot-rws/ with same naming as public/tarot/.
 *
 * License: Public Domain (original 1909–1910 RWS art).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'tarot-rws');
const UA = 'PaljaLabRWSFetcher/1.0 (https://8code.kr; contact hello@8code.kr)';
const MAX_W = 560;
const JPEG_Q = 82;

/** Commons file title (without File:) → local basename without ext */
const FILES = [
  // Major 0–21
  ['The Fool (Rider-Waite Smith tarot deck).png', 'major (0)'],
  ['The Magician (Rider-Waite Smith tarot deck).png', 'major (1)'],
  ['The High Priestess (Rider-Waite Smith tarot deck).png', 'major (2)'],
  ['The Empress (Rider-Waite Smith tarot deck).png', 'major (3)'],
  ['The Emperor (Rider-Waite Smith tarot deck).png', 'major (4)'],
  ['The Hierophant (Rider-Waite Smith tarot deck).png', 'major (5)'],
  ['The Lovers (Rider-Waite Smith tarot deck).png', 'major (6)'],
  ['The Chariot (Rider-Waite Smith tarot deck).png', 'major (7)'],
  ['Strength (Rider-Waite Smith tarot deck).png', 'major (8)'],
  ['The Hermit (Rider-Waite Smith tarot deck).png', 'major (9)'],
  ['Wheel of Fortune (Rider-Waite Smith tarot deck).png', 'major (10)'],
  ['Justice (Rider-Waite Smith tarot deck).png', 'major (11)'],
  ['The Hanged Man (Rider-Waite Smith tarot deck).png', 'major (12)'],
  ['Death (Rider-Waite Smith tarot deck).png', 'major (13)'],
  ['Temperance (Rider-Waite Smith tarot deck).png', 'major (14)'],
  ['The Devil (Rider-Waite Smith tarot deck).png', 'major (15)'],
  ['The Tower (Rider-Waite Smith tarot deck).png', 'major (16)'],
  ['The Star (Rider-Waite Smith tarot deck).png', 'major (17)'],
  ['The Moon (Rider-Waite Smith tarot deck).png', 'major (18)'],
  ['The Sun (Rider-Waite Smith tarot deck).png', 'major (19)'],
  ['Judgement (Rider-Waite Smith tarot deck).png', 'major (20)'],
  ['The World (Rider-Waite Smith tarot deck).png', 'major (21)'],
];

const SUITS = [
  ['wands', 'Wands'],
  ['cups', 'Cups'],
  ['swords', 'Swords'],
  ['pentacles', 'Pentacles'],
];

const RANKS = [
  [1, (s) => (s === 'Swords' || s === 'Pentacles' ? `One of ${s}` : `Ace of ${s}`)],
  [2, (s) => `Two of ${s}`],
  [3, (s) => `Three of ${s}`],
  [4, (s) => `Four of ${s}`],
  [5, (s) => `Five of ${s}`],
  [6, (s) => `Six of ${s}`],
  [7, (s) => `Seven of ${s}`],
  [8, (s) => `Eight of ${s}`],
  [9, (s) => `Nine of ${s}`],
  [10, (s) => `Ten of ${s}`],
  [11, (s) => `Page of ${s}`],
  [12, (s) => `Knight of ${s}`],
  [13, (s) => `Queen of ${s}`],
  [14, (s) => `King of ${s}`],
];

for (const [folder, suitEn] of SUITS) {
  for (const [n, nameFn] of RANKS) {
    FILES.push([`${nameFn(suitEn)} (Rider-Waite Smith tarot deck).png`, `${folder} (${n})`]);
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function resolveOriginalUrl(fileTitle) {
  const api =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url' +
    '&titles=' +
    encodeURIComponent('File:' + fileTitle);
  const data = await fetchJson(api);
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  const url = page?.imageinfo?.[0]?.url;
  if (!url) throw new Error('No URL for ' + fileTitle + ' ' + JSON.stringify(page));
  return url;
}

async function downloadBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('Cards:', FILES.length, '→', OUT);

  let ok = 0;
  for (const [title, base] of FILES) {
    const outPath = path.join(OUT, base + '.jpg');
    process.stdout.write(`… ${base} `);
    try {
      const srcUrl = await resolveOriginalUrl(title);
      const buf = await downloadBuffer(srcUrl);
      await sharp(buf)
        .resize({ width: MAX_W, withoutEnlargement: true })
        .jpeg({ quality: JPEG_Q, mozjpeg: true })
        .toFile(outPath);
      const kb = Math.round(fs.statSync(outPath).size / 1024);
      console.log(`OK ${kb}KB`);
      ok++;
    } catch (e) {
      console.log('FAIL', e.message);
    }
    await new Promise((r) => setTimeout(r, 350));
  }

  const readme = `# Rider–Waite–Smith (web)

Public-domain scans cleaned by YarnSpinnerTool (Geldard set on Wikimedia Commons).
Original art: Pamela Colman Smith / A. E. Waite (1909–1910).

Source: https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck_(Geldard)

Used for counselor "draw-only" mode on 팔자연구소 Tarot. Regenerated via scripts/download-rws-deck.mjs.
`;
  fs.writeFileSync(path.join(OUT, 'README.md'), readme);
  console.log(`Done ${ok}/${FILES.length}`);
  if (ok !== FILES.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
