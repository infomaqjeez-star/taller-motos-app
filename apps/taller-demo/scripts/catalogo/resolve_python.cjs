/**
 * Encuentra python.exe en Windows aunque "py"/"python" no estén en el PATH de Node (npm).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * @returns {string|null} ruta absoluta a python.exe o null
 */
function resolvePythonExe() {
  const fromEnv = process.env.PYTHON_EXE || process.env.PYTHON || "";
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }

  if (process.platform === "win32") {
    const tryExec = (cmd) => {
      try {
        const out = execSync(cmd, {
          encoding: "utf8",
          windowsHide: true,
          timeout: 12000,
        }).trim();
        if (out && fs.existsSync(out)) {
          return out;
        }
      } catch (_) {
        /* ignore */
      }
      return null;
    };

    const a = tryExec('py -3 -c "import sys; print(sys.executable)"');
    if (a) {
      return a;
    }
    const b = tryExec('py -c "import sys; print(sys.executable)"');
    if (b) {
      return b;
    }

    const la = process.env.LOCALAPPDATA;
    if (la) {
      for (const v of [
        "Python314",
        "Python313",
        "Python312",
        "Python311",
        "Python310",
      ]) {
        const exe = path.join(la, "Programs", "Python", v, "python.exe");
        if (fs.existsSync(exe)) {
          return exe;
        }
      }
    }

    const pf = process.env.PROGRAMFILES;
    if (pf) {
      for (const v of ["Python312", "Python311", "Python310"]) {
        const exe = path.join(pf, v, "python.exe");
        if (fs.existsSync(exe)) {
          return exe;
        }
      }
    }
  }

  return null;
}

module.exports = { resolvePythonExe };
