import { spawn } from "node:child_process";

process.env.NODE_ENV = "production";

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
