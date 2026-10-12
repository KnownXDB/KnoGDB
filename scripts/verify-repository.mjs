import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Basic public-repository policy checks; not a comprehensive secret scanner.
const required = ['LICENSE', 'SECURITY.md', 'GOVERNANCE.md', '.github/CODEOWNERS'];
const failures = [];
for (const path of required) {
  try { readFileSync(path); } catch { failures.push(`Missing required file: ${path}`); }
}
const paths = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
  .toString().split('\0').filter(Boolean);
const forbidden = /(^|\/)(?:\.env(?:\..+)?|secrets|\.secrets|uploads|test-results|playwright-report|screenshots|videos)(?:\/|$)|\.(?:pem|key|p12|pfx|jks|keystore|dump|backup|png|jpe?g|ico|mp4|webm)$/i;
const signatures = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /(?:postgres(?:ql)?):\/\/[^\s:/]+:[^\s@]+@/i,
];
for (const path of paths) {
  if (forbidden.test(path) && !/(^|\/)\.env\.example$/.test(path)) {
    failures.push(`Forbidden public artifact: ${path}`);
    continue;
  }
  const data = readFileSync(path);
  if (data.includes(0)) {
    failures.push(`Binary file requires explicit review: ${path}`);
    continue;
  }
  if (signatures.some(pattern => pattern.test(data.toString('utf8')))) {
    // Never print matching values or surrounding text.
    failures.push(`Possible credential: ${path}`);
  }
}
if (failures.length) {
  for (const failure of failures) process.stderr.write(`${failure}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Repository policy passed (${paths.length} files). Not a full secret audit.\n`);
}
