// Read the raw ZIP as binary (not UTF-8) and try to decompress
const fs = require("fs");
const zlib = require("zlib");

// Read as binary buffer - simulating what meliGetRaw returns as ArrayBuffer
const raw = fs.readFileSync(__dirname + "/_last_zpl.txt");
console.log("Raw file size:", raw.length);
console.log("Hex header:", raw.slice(0, 10).toString("hex"));

// The _last_zpl.txt was saved from JSON string (corrupted).
// Let's check if the UTF-8 encoding destroyed the bytes.
// PK in hex is 50 4b - let's check:
console.log("Byte 0:", raw[0], "expected 80 (0x50)");
console.log("Byte 1:", raw[1], "expected 75 (0x4b)");

// The issue: when binary data passes through JSON.stringify -> JSON.parse -> string,
// multi-byte sequences get mangled. This is why the agent can't decompress.
// The backend has the ORIGINAL ArrayBuffer from fetch() which is NOT corrupted.

// Let's verify: re-read as 'latin1' (binary-safe) encoding
const rawLatin1 = fs.readFileSync(__dirname + "/_last_zpl.txt", "latin1");
const buf2 = Buffer.from(rawLatin1, "latin1");
console.log("\nUsing latin1 encoding:");
console.log("Byte 0:", buf2[0], "Byte 1:", buf2[1]);

const compMethod = buf2[8] | (buf2[9] << 8);
let compSize = buf2[18] | (buf2[19] << 8) | (buf2[20] << 16) | (buf2[21] << 24);
const fnLen = buf2[26] | (buf2[27] << 8);
const exLen = buf2[28] | (buf2[29] << 8);
const dataStart = 30 + fnLen + exLen;

console.log("compMethod:", compMethod, "compSize:", compSize, "fnLen:", fnLen, "exLen:", exLen, "dataStart:", dataStart);

// Find Central Directory
if (compSize === 0) {
  for (let i = dataStart; i < buf2.length - 4; i++) {
    if (buf2[i] === 0x50 && buf2[i+1] === 0x4B && buf2[i+2] === 0x01 && buf2[i+3] === 0x02) {
      compSize = buf2[i+20] | (buf2[i+21] << 8) | (buf2[i+22] << 16) | (buf2[i+23] << 24);
      console.log("Found Central Dir at", i, "compSize from CD:", compSize);
      break;
    }
  }
}

if (compSize === 0) {
  // Estimate from next PK
  for (let i = dataStart; i < buf2.length - 4; i++) {
    if (buf2[i] === 0x50 && buf2[i+1] === 0x4B) {
      compSize = i - dataStart;
      console.log("Estimated compSize from next PK:", compSize, "at offset", i);
      break;
    }
  }
}

if (compMethod === 8 && compSize > 0) {
  try {
    const compressed = buf2.slice(dataStart, dataStart + compSize);
    console.log("Attempting inflateRaw on", compressed.length, "bytes...");
    const decompressed = zlib.inflateRawSync(compressed);
    console.log("SUCCESS! Decompressed:", decompressed.length, "bytes");
    console.log("Content:", decompressed.toString("utf8").substring(0, 500));
  } catch(e) {
    console.error("FAILED:", e.message);
  }
}
