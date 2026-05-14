import { spawn } from 'node:child_process';
import net from 'node:net';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const electronCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const viteUrl = 'http://127.0.0.1:5173';

let shuttingDown = false;
let viteProcess;
let electronProcess;

function run(command, args, name) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    windowsHide: false,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (name === 'electron') {
      shutdown(0);
      return;
    }

    if (code !== 0) {
      console.error(`${name} exited with code ${code ?? signal}.`);
      shutdown(code ?? 1);
    }
  });

  return child;
}

function waitForPort(host, port, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host, port });

      socket.on('connect', () => {
        socket.end();
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}.`));
          return;
        }
        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });
}

function stopProcess(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  child.kill('SIGTERM');
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stopProcess(electronProcess);
  stopProcess(viteProcess);
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('uncaughtException', (error) => {
  console.error(error);
  shutdown(1);
});

console.log('Starting Vite dev server...');
viteProcess = run(npmCommand, ['run', 'dev'], 'vite');

try {
  await waitForPort('127.0.0.1', 5173);
  console.log(`Vite is ready at ${viteUrl}`);
  console.log('Starting Electron...');
  electronProcess = run(electronCommand, ['electron', '.'], 'electron');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}
