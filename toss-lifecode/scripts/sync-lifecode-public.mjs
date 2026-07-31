/**
 * paljaweb/public/lifecode-play → toss-lifecode/public/lifecode-play
 * (+ play-ads.js 는 번들 로컬 테스트용으로만 복사, 운영 iframe은 8code.kr)
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

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(relFrom, relTo = relFrom) {
  const from = path.join(srcRoot, relFrom);
  const to = path.join(destRoot, relTo);
  if (!fs.existsSync(from)) {
    console.warn("[sync-lifecode] skip (missing):", relFrom);
    return;
  }
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function copyDirRecursive(relFrom, relTo = relFrom) {
  const from = path.join(srcRoot, relFrom);
  const to = path.join(destRoot, relTo);
  if (!fs.existsSync(from)) {
    console.warn("[sync-lifecode] skip dir (missing):", relFrom);
    return;
  }
  ensureDir(to);
  for (const name of fs.readdirSync(from)) {
    const srcFile = path.join(from, name);
    const destFile = path.join(to, name);
    if (fs.statSync(srcFile).isDirectory()) {
      copyDirRecursive(path.join(relFrom, name), path.join(relTo, name));
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

copyDirRecursive("lifecode-play", "lifecode-play");
copyFile("js/play-ads.js", "js/play-ads.js");

const indexPath = path.join(destRoot, "lifecode-play", "index.html");
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, "utf8");
  // 번들 로컬 경로: /lifecode-play/ → 상대, /js/ → ../js/
  html = html.replaceAll('href="/lifecode-play/', 'href="./');
  html = html.replaceAll('src="/lifecode-play/', 'src="./');
  html = html.replaceAll('src="/js/', 'src="../js/');
  const meta = `name="lifecode-bundle-version" content="${bundleVersion}"`;
  if (html.includes("lifecode-bundle-version")) {
    html = html.replace(/name="lifecode-bundle-version"\s+content="[^"]*"/, meta);
  } else {
    html = html.replace(
      /<meta charset="UTF-8"\s*\/?>/i,
      `<meta charset="UTF-8"/>\n  <meta ${meta} />`,
    );
  }
  fs.writeFileSync(indexPath, html);
  console.log("[sync-lifecode] bundle version:", bundleVersion);
}

const iconCandidates = [
  path.resolve(root, "..", "public", "lifecode-play", "icon-512.png"),
  path.resolve(root, "..", "applogo600.png"),
  path.resolve(root, "..", "applogo600.jpg"),
];
for (const iconSrc of iconCandidates) {
  if (fs.existsSync(iconSrc)) {
    ensureDir(destRoot);
    const ext = path.extname(iconSrc);
    fs.copyFileSync(iconSrc, path.join(destRoot, `brand-icon${ext}`));
    console.log("[sync-lifecode] brand-icon from", path.basename(iconSrc));
    break;
  }
}

console.log("[sync-lifecode] ok");
