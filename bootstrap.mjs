import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const archive = path.join(root, 'Jobly-V23-Fix-Abonnement-CTA-16-09-2026.zip');
if (!fs.existsSync(archive)) throw new Error(`V23 archive missing: ${archive}`);

const temp = path.join(root, '.jobly-v23-extract');
fs.rmSync(temp, { recursive: true, force: true });
fs.mkdirSync(temp, { recursive: true });

execFileSync('unzip', ['-q', '-o', archive, '-d', temp], { stdio: 'inherit' });
const extractedRoot = path.join(temp, 'jobly_v23');
if (!fs.existsSync(path.join(extractedRoot, 'package.json'))) throw new Error('Extracted V23 package.json not found');

for (const name of fs.readdirSync(extractedRoot)) {
  const src = path.join(extractedRoot, name);
  const dst = path.join(root, name);
  fs.rmSync(dst, { recursive: true, force: true });
  fs.renameSync(src, dst);
}
fs.rmSync(temp, { recursive: true, force: true });

execFileSync('npm', ['install'], { cwd: root, stdio: 'inherit' });
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
