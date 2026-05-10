/**
 * Ejecuta run_full_catalogo.py (pip + JSON + carpetas). Cwd = apps/taller-demo.
 * npm run catalogo:generate:all
 * Argumentos extra se reenvían a Python, ej. npm run catalogo:generate:all -- --skip-extract
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const script = path.join(__dirname, "run_full_catalogo.py");
const extra = process.argv.slice(2);

const win = process.platform === "win32";
const attempts = win
  ? [
      ["py", ["-3", script, ...extra]],
      ["py", [script, ...extra]],
      ["python", [script, ...extra]],
    ]
  : [
      ["python3", [script, ...extra]],
      ["python", [script, ...extra]],
    ];

for (const [exe, argv] of attempts) {
  const r = spawnSync(exe, argv, { cwd: root, stdio: "inherit" });
  if (r.error && r.error.code === "ENOENT") {
    continue;
  }
  process.exit(r.status === null ? 1 : r.status);
}

console.error(
  "\nNo se pudo ejecutar Python. Instalá Python 3 y probá: py -3 --version\n"
);
process.exit(1);
