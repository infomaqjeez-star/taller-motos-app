// Parse ZIP with data descriptor support
const fs = require("fs");
const zlib = require("zlib");

const raw = fs.readFileSync(__dirname + "/_last_zpl.txt");
console.log("File size:", raw.length);

// Find Central Directory (PK\x01\x02)
let cdOffset = -1;
for (let i = raw.length - 22; i >= 0; i--) {
  // End of Central Directory: PK\x05\x06
  if (raw[i] === 0x50 && raw[i+1] === 0x4B && raw[i+2] === 0x05 && raw[i+3] === 0x06) {
    cdOffset = raw[i+16] | (raw[i+17] << 8) | (raw[i+18] << 16) | (raw[i+19] << 24);
    console.log("End of Central Dir at:", i);
    console.log("Central Dir offset:", cdOffset);
    break;
  }
}

// Find Central Directory entry (PK\x01\x02)
for (let i = 0; i < raw.length - 4; i++) {
  if (raw[i] === 0x50 && raw[i+1] === 0x4B && raw[i+2] === 0x01 && raw[i+3] === 0x02) {
    const compMethod = raw[i+10] | (raw[i+11] << 8);
    const compSize = raw[i+20] | (raw[i+21] << 8) | (raw[i+22] << 16) | (raw[i+23] << 24);
    const uncompSize = raw[i+24] | (raw[i+25] << 8) | (raw[i+26] << 16) | (raw[i+27] << 24);
    const fnLen = raw[i+28] | (raw[i+29] << 8);
    const filename = raw.slice(i+46, i+46+fnLen).toString("utf8");
    const localHeaderOffset = raw[i+42] | (raw[i+43] << 8) | (raw[i+44] << 16) | (raw[i+45] << 24);
    
    console.log("\nCentral Dir entry:");
    console.log("  Filename:", filename);
    console.log("  Comp method:", compMethod);
    console.log("  Comp size:", compSize);
    console.log("  Uncomp size:", uncompSize);
    console.log("  Local header at:", localHeaderOffset);

    // Now extract using correct sizes
    const lhFnLen = raw[localHeaderOffset+26] | (raw[localHeaderOffset+27] << 8);
    const lhExLen = raw[localHeaderOffset+28] | (raw[localHeaderOffset+29] << 8);
    const dataStart = localHeaderOffset + 30 + lhFnLen + lhExLen;
    console.log("  Data starts at:", dataStart);

    if (compMethod === 8 && compSize > 0) {
      try {
        const compressed = raw.slice(dataStart, dataStart + compSize);
        console.log("  Compressed chunk:", compressed.length, "bytes");
        const decompressed = zlib.inflateRawSync(compressed);
        console.log("  Decompressed:", decompressed.length, "bytes");
        console.log("  Content (first 300):", decompressed.toString("utf8").substring(0, 300));
      } catch(e) {
        console.error("  Decompress error:", e.message);
      }
    }
    break;
  }
}
