import fs from "node:fs";
import path from "node:path";

const assetRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_v01.json"
);
const portableOutputPath = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_v02_t0_t4_portrait_samples.json"
);
const pathOutputPath = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_paths_v02_t0_t4_portrait_samples.json"
);

const portable = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
portable.name = "Decisive GM v50 Official Brand + T0-T4 Portrait Samples";
portable.version = "v50-codex-t0-t4-portrait-samples-v01";
portable.description =
  "20-team official brand baseline plus T0-T4 capMark, homeUniform, and awayUniform portrait-layer samples.";
const pathTheme = JSON.parse(JSON.stringify(portable));

const fields = ["capMark", "homeUniform", "awayUniform"];
for (let index = 0; index < 5; index += 1) {
  const teamId = `T${index}`;
  for (const field of fields) {
    const relativePath =
      `production_assets/teams/${teamId}/${field}_256_v01.png`;
    const filePath = path.join(assetRoot, ...relativePath.split("/"));
    const base64 = fs.readFileSync(filePath).toString("base64");
    portable.teams[teamId][field] = `data:image/png;base64,${base64}`;
    pathTheme.teams[teamId][field] = relativePath;
  }
}

fs.writeFileSync(
  portableOutputPath,
  `${JSON.stringify(portable, null, 2)}\n`,
  "utf8"
);
fs.writeFileSync(
  pathOutputPath,
  `${JSON.stringify(pathTheme, null, 2)}\n`,
  "utf8"
);

console.log(
  JSON.stringify(
    {
      version: portable.version,
      completedTeams: ["T0", "T1", "T2", "T3", "T4"],
      teamAssetCount: 15,
      portableTheme: path.relative(assetRoot, portableOutputPath).replaceAll("\\", "/"),
      pathTheme: path.relative(assetRoot, pathOutputPath).replaceAll("\\", "/"),
    },
    null,
    2
  )
);
