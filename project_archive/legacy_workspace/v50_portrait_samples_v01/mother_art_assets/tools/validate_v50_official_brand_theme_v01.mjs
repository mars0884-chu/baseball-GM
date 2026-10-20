import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const assetRoot = path.resolve(import.meta.dirname, "..");
const portablePath = path.join(assetRoot, "theme_pack", "v50_official_brand_theme_v01.json");
const pathThemePath = path.join(assetRoot, "theme_pack", "v50_official_brand_theme_paths_v01.json");
const manifestPath = path.join(assetRoot, "docs", "v50_official_brand_theme_manifest_v01.json");

const portable = JSON.parse(fs.readFileSync(portablePath, "utf8"));
const pathTheme = JSON.parse(fs.readFileSync(pathThemePath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const errors = [];
const checks = [];

function check(condition, label) {
  checks.push({ label, passed: Boolean(condition) });
  if (!condition) errors.push(label);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

const expectedIds = Array.from({ length: 20 }, (_, index) => `T${index}`);
check(Object.keys(portable.teams).length === 20, "portable theme has exactly 20 teams");
check(Object.keys(pathTheme.teams).length === 20, "path theme has exactly 20 teams");
check(manifest.teams.length === 20, "manifest has exactly 20 teams");

for (const teamId of expectedIds) {
  const portableTeam = portable.teams[teamId];
  const pathTeam = pathTheme.teams[teamId];
  const manifestTeam = manifest.teams.find((team) => team.id === teamId);

  check(Boolean(portableTeam), `${teamId} exists in portable theme`);
  check(Boolean(pathTeam), `${teamId} exists in path theme`);
  check(Boolean(manifestTeam), `${teamId} exists in manifest`);
  if (!portableTeam || !pathTeam || !manifestTeam) continue;

  check(/^#[0-9A-F]{6}$/.test(portableTeam.primaryColor), `${teamId} primary color format`);
  check(/^#[0-9A-F]{6}$/.test(portableTeam.secondaryColor), `${teamId} secondary color format`);
  check(portableTeam.primaryColor === manifestTeam.primaryColor, `${teamId} primary color matches manifest`);
  check(portableTeam.secondaryColor === manifestTeam.secondaryColor, `${teamId} secondary color matches manifest`);
  check(portableTeam.shortName === manifestTeam.shortName, `${teamId} shortName matches manifest`);
  check(portableTeam.brandKey === manifestTeam.brandKey, `${teamId} brandKey matches manifest`);
  check(!("capMark" in portableTeam), `${teamId} does not claim capMark complete`);
  check(!("homeUniform" in portableTeam), `${teamId} does not claim homeUniform complete`);
  check(!("awayUniform" in portableTeam), `${teamId} does not claim awayUniform complete`);

  const prefix = "data:image/png;base64,";
  check(portableTeam.logo.startsWith(prefix), `${teamId} logo is embedded PNG data URI`);
  const embedded = Buffer.from(portableTeam.logo.slice(prefix.length), "base64");
  const sourcePath = path.join(assetRoot, ...pathTeam.logo.split("/"));
  const source = fs.readFileSync(sourcePath);
  check(embedded.equals(source), `${teamId} embedded logo matches source PNG`);
  check(sha256(source) === manifestTeam.logoSha256, `${teamId} logo SHA-256 matches manifest`);
}

const report = {
  validationVersion: 1,
  packageVersion: portable.version,
  passed: errors.length === 0,
  teamCount: expectedIds.length,
  checkCount: checks.length,
  passedCount: checks.filter((item) => item.passed).length,
  failedCount: errors.length,
  errors
};

const outputPath = path.join(assetRoot, "docs", "v50_official_brand_theme_validation_v01.json");
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.passed ? 0 : 1;
