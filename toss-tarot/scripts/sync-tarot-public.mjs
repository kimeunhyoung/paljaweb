/**
 * paljaweb/public → toss-tarot/public (타로코드 정적 자산)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcRoot = path.resolve(root, "..", "public");
const destRoot = path.resolve(root, "public");

const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const bundleVersion = String(pkg.version || "0.0.0");

function stampBundleVersion(html) {
  const meta = `name="tarot-bundle-version" content="${bundleVersion}"`;
  if (html.includes("tarot-bundle-version")) {
    return html.replace(/name="tarot-bundle-version"\s+content="[^"]*"/, meta);
  }
  return html.replace(
    /<meta charset="UTF-8"\s*\/?>/i,
    `<meta charset="UTF-8"/>\n  <meta ${meta} />`,
  );
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(relFrom, relTo) {
  const from = path.join(srcRoot, relFrom);
  const to = path.join(destRoot, relTo);
  if (!fs.existsSync(from)) {
    console.warn("[sync-tarot-public] skip (missing):", relFrom);
    return;
  }
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function copyDirFiles(relFrom, relTo) {
  const from = path.join(srcRoot, relFrom);
  const to = path.join(destRoot, relTo);
  if (!fs.existsSync(from)) {
    console.warn("[sync-tarot-public] skip dir (missing):", relFrom);
    return;
  }
  ensureDir(to);
  for (const name of fs.readdirSync(from)) {
    const srcFile = path.join(from, name);
    const destFile = path.join(to, name);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

const files = [
  "Tarot.html",
  "tarot-app.html",
  "css/site-header.css",
  "js/tarot-topic-lens.js",
  "js/tarot-spread-bridge.js",
  "js/tarot-major-scripted.js",
  "js/tarot-minor-scripted.js",
  "js/tarot-ads.js",
];

for (const f of files) copyFile(f, f);
copyDirFiles("tarot", "tarot");

const tarotPath = path.join(destRoot, "Tarot.html");
if (fs.existsSync(tarotPath)) {
  let html = fs.readFileSync(tarotPath, "utf8");
  html = stampBundleVersion(html);
  fs.writeFileSync(tarotPath, html);
  console.log("[sync-tarot-public] bundle version:", bundleVersion);
}

const adGroupId = process.env.TOSS_AD_GROUP_ID?.trim();
if (adGroupId) {
  if (fs.existsSync(tarotPath)) {
    let html = fs.readFileSync(tarotPath, "utf8");
    html = html.replace(
      /name="tarot-toss-ad-group"\s+content="[^"]*"/,
      `name="tarot-toss-ad-group" content="${adGroupId}"`,
    );
    fs.writeFileSync(tarotPath, html);
    console.log("[sync-tarot-public] tarot-toss-ad-group set");
  }
}

const iconSrc = path.resolve(root, "..", "applogo600.jpg");
if (fs.existsSync(iconSrc)) {
  ensureDir(destRoot);
  fs.copyFileSync(iconSrc, path.join(destRoot, "brand-icon.jpg"));
}

const n = fs.existsSync(path.join(destRoot, "tarot"))
  ? fs.readdirSync(path.join(destRoot, "tarot")).length
  : 0;
console.log("[sync-tarot-public] ok — tarot images:", n);
