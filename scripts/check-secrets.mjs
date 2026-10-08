// ตรวจหา secret / token / ข้อมูลส่วนบุคคลที่อาจหลุดเข้า repository ก่อน commit
// วิธีใช้: node scripts/check-secrets.mjs   (คืนค่า exit code 1 ถ้าพบสิ่งที่น่าสงสัย)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'output', 'dist', 'fonts', 'vendor']);
const TEXT_EXT = /\.(js|mjs|cjs|json|html|css|md|yml|yaml|txt|py|sh|svg|example|gitignore)$/i;

const RULES = [
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['OpenAI/Anthropic-style key', /\bsk-(ant-)?[A-Za-z0-9_-]{20,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['Private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Hard-coded password/secret', /\b(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i],
  ['Email address', /\b[A-Za-z0-9._%+-]+@(?!example\.com|users\.noreply\.github\.com|anthropic\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ['Thai national ID-like number', /\b\d-\d{4}-\d{5}-\d{2}-\d\b|\b\d{13}\b/],
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* walk(p);
    } else if (TEXT_EXT.test(name) || name === '.env.example') {
      yield p;
    }
  }
}

let findings = 0;
let scanned = 0;
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (rel === 'scripts/check-secrets.mjs') continue; // ไฟล์นี้มีรูปแบบ regex เอง
  scanned++;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [name, re] of RULES) {
      if (re.test(line)) {
        findings++;
        console.log(`พบ ${name}: ${rel}:${i + 1}`);
      }
    }
  });
}

// ไฟล์ .env จริงต้องไม่อยู่ใน repo
for (const f of ['.env', '.env.local', '.env.production']) {
  try { statSync(join(ROOT, f)); findings++; console.log(`พบไฟล์ ${f} — ห้าม commit`); } catch { /* ไม่มีไฟล์ = ดี */ }
}

console.log(`ตรวจ ${scanned} ไฟล์ พบสิ่งที่น่าสงสัย ${findings} รายการ`);
process.exit(findings ? 1 : 0);
