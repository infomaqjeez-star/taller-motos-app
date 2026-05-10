/**
 * Ejecuta run_folders.py (build_product_folders). Cwd = apps/taller-demo.
 * npm run catalogo:folders:10  |  npm run catalogo:folders:all
 * Doble clic: GenerarCatalogo10.bat (no requiere npm)
 */
const { spawnSync } = require("child_process");
const path = require("path");
const { resolvePythonExe } = require("./resolve_python.cjs");

const root = path.join(__dirname, "..", "..");
const runner = path.join(__dirname, "run_folders.py");
const mode = process.argv[2] || "10";

const attempts = [];
const resolved = resolvePythonExe();
if (resolved) {
  attempts.push([resolved, [runner, mode]]);
}
if (process.platform === "win32") {
  attempts.push(
    ["py", ["-3", runner, mode]],
    ["py", [runner, mode]],
    ["python", [runner, mode]]
  );
} else {
  attempts.push(
    ["python3", [runner, mode]],
    ["python", [runner, mode]]
  );
}

for (const [exe, argv] of attempts) {
  const r = spawnSync(exe, argv, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.error && r.error.code === "ENOENT") {
    continue;
  }
  process.exit(r.status === null ? 1 : r.status);
}

console.error(
  "\nNo se pudo ejecutar Python. Instalá Python 3 desde https://www.python.org/downloads/\n" +
    'Marcá "Add python.exe to PATH". Si ya está instalado: desactivá los alias python.exe / python3.exe\n' +
    "en Configuración → Aplicaciones → Alias de ejecución de aplicaciones (Microsoft Store).\n" +
    "O definí la variable de entorno PYTHON_EXE con la ruta completa a python.exe\n"
);
process.exit(1);
