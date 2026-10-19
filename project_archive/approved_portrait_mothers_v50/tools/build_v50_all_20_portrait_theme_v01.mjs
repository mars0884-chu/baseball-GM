import fs from "node:fs";
import path from "node:path";

const assetRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_v01.json"
);
const portableOutput = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_v03_all_20_portrait_layers.json"
);
const pathOutput = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_paths_v03_all_20_portrait_layers.json"
);

const portable = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
portable.name = "Decisive GM v50 Official Brand + All 20 Portrait Layers";
portable.version = "v50-codex-all-20-portrait-layers-v01";
portable.description =
  "20-team official brand theme with complete capMark, homeUniform, and awayUniform portrait layers.";
const pathTheme = JSON.parse(JSON.stringify(portable));
const fields = ["capMark", "homeUniform", "awayUniform"];

for (let index = 0; index < 20; index += 1) {
  const teamId = `T${index}`;
  for (const field of fields) {
    const relativePath =
      `production_assets/teams/${teamId}/${field}_256_v01.png`;
    const filePath = path.join(assetRoot, ...relativePath.split("/"));
    const data = fs.readFileSync(filePath);
    portable.teams[teamId][field] =
      `data:image/png;base64,${data.toString("base64")}`;
    pathTheme.teams[teamId][field] = relativePath;
  }
}

fs.writeFileSync(portableOutput, `${JSON.stringify(portable, null, 2)}\n`, "utf8");
fs.writeFileSync(pathOutput, `${JSON.stringify(pathTheme, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      version: portable.version,
      completedTeams: 20,
      portraitLayerCount: 60,
      portableTheme: path.relative(assetRoot, portableOutput).replaceAll("\\", "/"),
      pathTheme: path.relative(assetRoot, pathOutput).replaceAll("\\", "/"),
    },
    null,
    2
  )
);
