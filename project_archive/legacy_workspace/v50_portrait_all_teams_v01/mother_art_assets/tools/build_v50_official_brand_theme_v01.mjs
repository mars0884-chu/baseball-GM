import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const assetRoot = path.resolve(import.meta.dirname, "..");
const themeDir = path.join(assetRoot, "theme_pack");
const docsDir = path.join(assetRoot, "docs");

const teams = [
  { id: "T0",  name: "靖安盾衛", shortName: "靖安", brandKey: "jingan_guardians",  primaryColor: "#1B3A6B", secondaryColor: "#C0C0C0" },
  { id: "T1",  name: "臨海獵鯊", shortName: "臨海", brandKey: "linhai_sharks",    primaryColor: "#005F73", secondaryColor: "#0A9396" },
  { id: "T2",  name: "曲江水牛", shortName: "曲江", brandKey: "qujiang_buffalo",   primaryColor: "#6B4226", secondaryColor: "#D4A373" },
  { id: "T3",  name: "永昌雄獅", shortName: "永昌", brandKey: "yongchang_lions",   primaryColor: "#B8860B", secondaryColor: "#1C1C1C" },
  { id: "T4",  name: "明陽烈焰", shortName: "明陽", brandKey: "mingyang_blaze",    primaryColor: "#CC3311", secondaryColor: "#FF8800" },
  { id: "T5",  name: "天啟鷹",   shortName: "天啟", brandKey: "tianqi_eagles",      primaryColor: "#2E4057", secondaryColor: "#D4AF37" },
  { id: "T6",  name: "龍城雲豹", shortName: "龍城", brandKey: "longcheng_leopards", primaryColor: "#4A4A4A", secondaryColor: "#E8C547" },
  { id: "T7",  name: "星野銀狐", shortName: "星野", brandKey: "xingye_foxes",      primaryColor: "#708090", secondaryColor: "#C0C0C0" },
  { id: "T8",  name: "雲夢白鷺", shortName: "雲夢", brandKey: "yunmeng_egrets",    primaryColor: "#F0F0F0", secondaryColor: "#4682B4" },
  { id: "T9",  name: "東寧豹",   shortName: "東寧", brandKey: "dongning_leopards", primaryColor: "#1C1C1C", secondaryColor: "#D4A017" },
  { id: "T10", name: "嘉禾金穗", shortName: "嘉禾", brandKey: "jiahe_harvest",     primaryColor: "#DAA520", secondaryColor: "#228B22" },
  { id: "T11", name: "瑞港海豚", shortName: "瑞港", brandKey: "ruigang_dolphins",  primaryColor: "#0077B6", secondaryColor: "#48CAE4" },
  { id: "T12", name: "金川礦工", shortName: "金川", brandKey: "jinchuan_miners",   primaryColor: "#5C4033", secondaryColor: "#E8A838" },
  { id: "T13", name: "玄武黑熊", shortName: "玄武", brandKey: "xuanwu_bears",      primaryColor: "#1C1C1C", secondaryColor: "#4B5320" },
  { id: "T14", name: "朝陽赤鷹", shortName: "朝陽", brandKey: "chaoyang_redhawks", primaryColor: "#B22222", secondaryColor: "#FFD700" },
  { id: "T15", name: "鳳鳴紅雀", shortName: "鳳鳴", brandKey: "fengming_redbirds", primaryColor: "#C41E3A", secondaryColor: "#FFFACD" },
  { id: "T16", name: "銀灘破浪", shortName: "銀灘", brandKey: "yintan_breakers",   primaryColor: "#006994", secondaryColor: "#F5F5DC" },
  { id: "T17", name: "青川山羌", shortName: "青川", brandKey: "qingchuan_serows",  primaryColor: "#2D6A4F", secondaryColor: "#B7E4C7" },
  { id: "T18", name: "望海白鯨", shortName: "望海", brandKey: "wanghai_whales",    primaryColor: "#E8E8E8", secondaryColor: "#1E3A5F" },
  { id: "T19", name: "磐石鐵衛", shortName: "磐石", brandKey: "panshi_ironguard",  primaryColor: "#36454F", secondaryColor: "#A9A9A9" }
];

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function pngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error("Not a PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

fs.mkdirSync(themeDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

const portable = {
  name: "Decisive GM v50 Official Brand Baseline",
  version: "v50-codex-brand-v01",
  description: "Codex official baseline: 20 existing team logos plus V50 TEAM_DEFS colors. No cap or uniform assets are claimed complete.",
  teams: {}
};

const pathBased = {
  name: "Decisive GM v50 Official Brand Baseline (Path Version)",
  version: "v50-codex-brand-v01",
  description: "Development path version. Resolve paths from the root of v50_art_assets.zip.",
  teams: {}
};

const manifest = {
  schemaVersion: 1,
  packageVersion: "v50-codex-brand-v01",
  colorAuthority: "V50 TEAM_DEFS",
  sourceLogoSize: 128,
  teams: []
};

for (const team of teams) {
  const relativeLogo = `production_assets/teams/${team.id}/logo_128.png`;
  const absoluteLogo = path.join(assetRoot, ...relativeLogo.split("/"));
  const png = fs.readFileSync(absoluteLogo);
  const dimensions = pngDimensions(png);
  if (dimensions.width !== 128 || dimensions.height !== 128) {
    throw new Error(`${team.id} logo is ${dimensions.width}x${dimensions.height}, expected 128x128`);
  }

  portable.teams[team.id] = {
    logo: `data:image/png;base64,${png.toString("base64")}`,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    shortName: team.shortName,
    brandKey: team.brandKey
  };

  pathBased.teams[team.id] = {
    logo: relativeLogo,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    shortName: team.shortName,
    brandKey: team.brandKey
  };

  manifest.teams.push({
    ...team,
    logo: relativeLogo,
    logoWidth: dimensions.width,
    logoHeight: dimensions.height,
    logoBytes: png.length,
    logoSha256: sha256(png),
    mappedFields: ["logo", "primaryColor", "secondaryColor", "shortName", "brandKey"],
    intentionallyUnmapped: ["capMark", "homeUniform", "awayUniform"]
  });
}

const portablePath = path.join(themeDir, "v50_official_brand_theme_v01.json");
const pathBasedPath = path.join(themeDir, "v50_official_brand_theme_paths_v01.json");
const manifestPath = path.join(docsDir, "v50_official_brand_theme_manifest_v01.json");

fs.writeFileSync(portablePath, `${JSON.stringify(portable, null, 2)}\n`, "utf8");
fs.writeFileSync(pathBasedPath, `${JSON.stringify(pathBased, null, 2)}\n`, "utf8");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const buildResult = {
  portableTheme: path.relative(assetRoot, portablePath).replaceAll("\\", "/"),
  portableBytes: fs.statSync(portablePath).size,
  portableSha256: sha256(fs.readFileSync(portablePath)),
  pathTheme: path.relative(assetRoot, pathBasedPath).replaceAll("\\", "/"),
  pathThemeBytes: fs.statSync(pathBasedPath).size,
  pathThemeSha256: sha256(fs.readFileSync(pathBasedPath)),
  manifest: path.relative(assetRoot, manifestPath).replaceAll("\\", "/"),
  manifestSha256: sha256(fs.readFileSync(manifestPath)),
  teamCount: teams.length
};

process.stdout.write(`${JSON.stringify(buildResult, null, 2)}\n`);
