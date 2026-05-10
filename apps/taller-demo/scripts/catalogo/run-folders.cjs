/**
 * Ejecuta build_product_folders.py con Python en Windows (py / py -3) o Linux/Mac (python3).
 * Uso: node scripts/catalogo/run-folders.cjs [10|all]
 * Cwd debe ser apps/taller-demo (como cuando npm run invoca este archivo).
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const script = path.join(__dirname, "build_product_folders.py");
const mode = process.argv[2] || "10";

const args = [
  script,
  "--out-root",
  "public/catalogo",
  "--flat",
  "--force",
  "--update-json",
];
if (mode === "all") {
  args.push("--pages", "all");
} else {
  args.push("--pages", "all", "--limit", "10");
}

const win = process.platform === "win32";
const attempts = win
  ? [
      ["py", ["-3", ...args]],
      ["py", args],
      ["python", args],
    ]
  : [
      ["python3", args],
      ["python", args],
    ];

for (const [exe, argv] of attempts) {
  const r = spawnSync(exe, argv, { cwd: root, stdio: "inherit" });
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
