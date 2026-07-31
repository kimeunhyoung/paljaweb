/**
 * npm run build 이후 생성된 .ait 경로를 출력합니다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const version = pkg.version || "?";

function findAit(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (name.endsWith(".ait") && fs.statSync(full).isFile()) {
      out.push(full);
    }
  }
  return out;
}

const candidates = [
  ...findAit(root),
  ...findAit(path.join(root, "dist")),
];

if (!candidates.length) {
  console.error("[print-ait] .ait 파일을 찾지 못했습니다. npm run build 를 먼저 실행하세요.");
  process.exit(1);
}

const latest = candidates.sort(
  (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs,
)[0];

console.log("");
console.log("=== 토스 버전 등록용 .ait ===");
console.log("버전:", version);
console.log(latest);
console.log("");
console.log("앱인토스 콘솔 → 개발 → 앱 출시 → 버전 등록하기 → 위 파일 업로드");
console.log("등록 가이드: toss-lifecode/TOSS_REGISTER.md");
console.log("");
