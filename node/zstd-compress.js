const fs = require("fs");
const { compressZstd, decompressZstd } = require("./utils");

async function run() {
  const inputPath = "data/test.txt";
  const raw = fs.readFileSync(inputPath);

  console.log("Original size:", raw.length);

  const comp = await compressZstd(raw);
  fs.writeFileSync("output/test.txt.zst", comp);
  console.log("Compressed size (zst):", comp.length);

  const decomp = await decompressZstd(comp);
  fs.writeFileSync("output/test.txt.dec", decomp);
  console.log("Decompressed size:", decomp.length);
  console.log("Round-trip identical:", Buffer.compare(raw, decomp) === 0);
}

run().catch((e) => {
  console.error("Zstd example failed", e);
});
