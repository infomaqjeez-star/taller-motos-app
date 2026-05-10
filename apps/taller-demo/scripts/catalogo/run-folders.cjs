/**
 * Ejecuta run_folders.py (build_product_folders). Cwd = apps/taller-demo.
 * Uso: node scripts/catalogo/run-folders.cjs [10|all]
 * npm run catalogo:folders:10  |  npm run catalogo:folders:all
 *
 * En Windows sin npm: doble clic en GenerarCatalogo10.bat o GenerarCatalogoCompleto.bat
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const runner = path.join(__dirname, "run_folders.py");
const mode = process.argv[2] || "10";

const win = process.platform === "win32";
const attempts = win
  ? [
      ["py", ["-3", runner, mode]],
      ["py", [runner, mode]],
      ["python", [runner, mode]],
    ]
  : [
      ["python3", [runner, mode]],
      ["python", [runner, mode]],
    ];

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
  "\nNo se pudo ejecutar Python. En Windows: instalá Python desde python.org y probá en CMD:\n" +
    "  py -3 --version\n" +
    "Si sigue fallando, desactivá en Configuración > Alias de ejecución de aplicaciones los alias \"python.exe\" y \"python3.exe\" que apuntan a la Store.\n"
);
process.exit(1);
