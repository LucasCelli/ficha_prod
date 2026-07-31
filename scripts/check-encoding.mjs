import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const roots = ["src", "scripts", "quality-tests"];
const textExtensions = new Set([".css", ".js", ".json", ".mjs", ".ts", ".tsx"]);
const mojibakePatterns = [/Ã[\u0080-\u00bf]/u, /Â[\u0080-\u00bf]/u, /â(?:€|€™|€œ|€œ|€“|€”)/u, /\uFFFD/u];
const failures = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await visit(path);
    else if (textExtensions.has(extname(entry.name))) {
      const text = await readFile(path, "utf8");
      const lines = text.split(/\r?\n/u);
      lines.forEach((line, index) => {
        if (mojibakePatterns.some((pattern) => pattern.test(line))) {
          failures.push(`${relative(process.cwd(), path)}:${index + 1}`);
        }
      });
    }
  }
}

await Promise.all(roots.map(visit));
if (failures.length) {
  console.error(`Mojibake detectado em:\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Encoding UTF-8 verificado sem padrões de mojibake.");
}