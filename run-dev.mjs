import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure port is always 3000 and not overridden by container PORT=8080
const env = { ...process.env, PORT: '3000' };

const nextBin = path.join(__dirname, 'node_modules', '.bin', 'next');

const child = spawn(nextBin, ['dev', '-p', '3000', '-H', '0.0.0.0'], {
  cwd: __dirname,
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});
