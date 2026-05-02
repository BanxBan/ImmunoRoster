import { spawn } from "node:child_process";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const HOST = "127.0.0.1";
const API_PORT = Number(process.env.PORT || 3000);
const VITE_PORT = 5173;

function isPortAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, HOST);
  });
}

function run(name, command, args) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: process.env,
    shell: false,
    stdio: ["inherit", "pipe", "pipe"]
  });

  child.stdout.on("data", chunk => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on("data", chunk => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on("exit", code => {
    if (shuttingDown) return;
    console.error(`[${name}] exited with code ${code}`);
    shutdown(code || 1);
  });

  return child;
}

let shuttingDown = false;
const children = [];

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const requiredPorts = [
  ["api", API_PORT],
  ["vite", VITE_PORT]
];

for (const [name, port] of requiredPorts) {
  if (!(await isPortAvailable(port))) {
    console.error(`[${name}] Port ${port} is already in use. Close the existing dev server on that port, then run npm run dev again.`);
    process.exit(1);
  }
}

children.push(
  run("api", process.execPath, ["local-dev-server.js"]),
  run("vite", process.execPath, [join("node_modules", "vite", "bin", "vite.js"), "--host", HOST, "--port", String(VITE_PORT), "--strictPort"])
);
