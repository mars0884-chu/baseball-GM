import fs from "node:fs";
import path from "node:path";

const assetRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_v01.json"
);
const outputPath = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_v02_t0_portrait_sample.json"
);
const pathOutputPath = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_paths_v02_t0_portrait_sample.json"
);

const theme = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
theme.name = "Decisive GM v50 Official Brand + T0 Portrait Sample";
theme.version = "v50-codex-t0-portrait-sample-v01";
theme.description =
  "20-team official brand baseline plus T0 capMark, homeUniform, and awayUniform portrait-layer sample.";

const paths = {
  capMark: "production_assets/teams/T0/capMark_256_v01.png",
  homeUniform: "production_assets/teams/T0/homeUniform_256_v01.png",
  awayUniform: "production_assets/teams/T0/awayUniform_256_v01.png",
};

for (const [field, relativePath] of Object.entries(paths)) {
  const filePath = path.join(assetRoot, ...relativePath.split("/"));
  const base64 = fs.readFileSync(filePath).toString("base64");
  theme.teams.T0[field] = `data:image/png;base64,${base64}`;
}

const pathTheme = JSON.parse(JSON.stringify(theme));
for (const [field, relativePath] of Object.entries(paths)) {
  pathTheme.teams.T0[field] = relativePath;
}

fs.writeFileSync(outputPath, `${JSON.stringify(theme, null, 2)}\n`, "utf8");
fs.writeFileSync(
  pathOutputPath,
  `${JSON.stringify(pathTheme, null, 2)}\n`,
  "utf8"
);
console.log(
  JSON.stringify(
    {
      version: theme.version,
      completedTeams: ["T0"],
      addedFields: Object.keys(paths),
      portableTheme: path.relative(assetRoot, outputPath).replaceAll("\\", "/"),
      pathTheme: path.relative(assetRoot, pathOutputPath).replaceAll("\\", "/"),
    },
    null,
    2
  )
);
