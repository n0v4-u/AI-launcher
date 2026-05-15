import { spawn } from 'node:child_process';
import net from 'node:net';

const npmCli = process.env.npm_execpath || (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const nodeCommand = process.execPath;
const viteUrl = 'http://127.0.0.1:5173';

let shuttingDown = false;
let viteProcess;
let electronProcess;

function run(command, args, name) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
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

function runAndWait(command, args, name) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      windowsHide: false,
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${name} exited with code ${code ?? signal}.`));
    });
  });
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

console.log('Building Electron main process...');
await runAndWait(nodeCommand, [npmCli, 'run', 'build:electron'], 'electron build');

console.log('Starting Vite dev server...');
viteProcess = run(nodeCommand, [npmCli, 'run', 'dev'], 'vite');

try {
  await waitForPort('127.0.0.1', 5173);
  console.log(`Vite is ready at ${viteUrl}`);
  console.log('Starting Electron...');
  electronProcess = run(nodeCommand, [npmCli, 'exec', '--', 'electron', '.'], 'electron');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}
