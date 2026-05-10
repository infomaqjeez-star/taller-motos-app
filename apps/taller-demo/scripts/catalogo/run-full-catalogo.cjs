/**
 * npm run catalogo:generate:all
 */
const { spawnSync } = require("child_process");
const path = require("path");
const { resolvePythonExe } = require("./resolve_python.cjs");

const root = path.join(__dirname, "..", "..");
const script = path.join(__dirname, "run_full_catalogo.py");
const extra = process.argv.slice(2);

const attempts = [];
const resolved = resolvePythonExe();
if (resolved) {
  attempts.push([resolved, [script, ...extra]]);
}
if (process.platform === "win32") {
  attempts.push(
    ["py", ["-3", script, ...extra]],
    ["py", [script, ...extra]],
    ["python", [script, ...extra]]
  );
} else {
  attempts.push(
    ["python3", [script, ...extra]],
    ["python", [script, ...extra]]
  );
}

for (const [exe, argv] of attempts) {
  const r = spawnSync(exe, argv, { cwd: root, stdio: "inherit", env: process.env });
  if (r.error && r.error.code === "ENOENT") {
    continue;
  }
  process.exit(r.status === null ? 1 : r.status);
}

console.error(
  "\nNo se pudo ejecutar Python. Misma ayuda que run-folders.cjs (PYTHON_EXE, python.org, alias Store).\n"
);
process.exit(1);
