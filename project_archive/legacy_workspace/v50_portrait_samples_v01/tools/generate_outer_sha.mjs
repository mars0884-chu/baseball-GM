import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2]);
const outputName = "SHA256SUMS.txt";
const files = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name !== outputName)
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, "en"));

const lines = files.map((name) => {
  const hash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, name)))
    .digest("hex");
  return `${hash}  ${name}`;
});
fs.writeFileSync(path.join(root, outputName), `${lines.join("\n")}\n`, "utf8");
console.log(JSON.stringify({ payloadFileCount: files.length, outputName }, null, 2));
