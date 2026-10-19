import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const assetRoot = path.resolve(import.meta.dirname, "..");
const portablePath = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_v02_t0_portrait_sample.json"
);
const pathThemePath = path.join(
  assetRoot,
  "theme_pack",
  "v50_official_brand_theme_paths_v02_t0_portrait_sample.json"
);
const themeJsPath = path.resolve(
  assetRoot,
  "..",
  "modular",
  "00-theme.js"
);

const portable = JSON.parse(fs.readFileSync(portablePath, "utf8"));
const pathTheme = JSON.parse(fs.readFileSync(pathThemePath, "utf8"));
const errors = [];
const checks = [];

function check(condition, label) {
  checks.push({ label, passed: Boolean(condition) });
  if (!condition) errors.push(label);
}

check(Object.keys(portable.teams).length === 20, "portable theme has 20 teams");
check(Object.keys(pathTheme.teams).length === 20, "path theme has 20 teams");

const required = ["capMark", "homeUniform", "awayUniform"];
const prefix = "data:image/png;base64,";
for (const field of required) {
  check(portable.teams.T0[field]?.startsWith(prefix), `T0 ${field} is embedded PNG`);
  check(
    typeof pathTheme.teams.T0[field] === "string" &&
      fs.existsSync(path.join(assetRoot, ...pathTheme.teams.T0[field].split("/"))),
    `T0 ${field} path exists`
  );
}

for (let index = 1; index < 20; index += 1) {
  const team = portable.teams[`T${index}`];
  for (const field of required) {
    check(!(field in team), `T${index} does not claim ${field} complete`);
  }
}

const source = fs.readFileSync(themeJsPath, "utf8");
const consoleWarnings = [];
const sandbox = {
  console: {
    warn: (...args) => consoleWarnings.push(args.map(String).join(" ")),
    log: () => {},
    error: () => {},
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: themeJsPath });
const gameResult = sandbox.validateThemePack(portable);
check(gameResult.valid === true, "game validateThemePack valid=true");
check(gameResult.warnings.length === 0, "game validateThemePack warnings=0");
check(consoleWarnings.length === 0, "game validator console warnings=0");

const report = {
  validationVersion: 1,
  packageVersion: portable.version,
  passed: errors.length === 0,
  checkCount: checks.length,
  passedCount: checks.filter((item) => item.passed).length,
  failedCount: errors.length,
  errors,
  gameValidation: {
    valid: gameResult.valid,
    warningCount: gameResult.warnings.length,
    consoleWarningCount: consoleWarnings.length,
  },
};
const reportPath = path.join(
  assetRoot,
  "docs",
  "v50_t0_portrait_sample_validation_v01.json"
);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed ? 0 : 1;
