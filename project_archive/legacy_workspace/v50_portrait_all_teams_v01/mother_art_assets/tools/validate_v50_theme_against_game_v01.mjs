import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const assetRoot = path.resolve(import.meta.dirname, "..");
const themePath = path.join(assetRoot, "theme_pack", "v50_official_brand_theme_v01.json");
const themeJsPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(assetRoot, "..", "modular", "00-theme.js");

const themePack = JSON.parse(fs.readFileSync(themePath, "utf8"));
const themeSource = fs.readFileSync(themeJsPath, "utf8");
const warnings = [];
const sandbox = {
  console: {
    warn: (...args) => warnings.push(args.map(String).join(" ")),
    log: () => {},
    error: () => {}
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(themeSource, sandbox, { filename: themeJsPath });

if (typeof sandbox.validateThemePack !== "function") {
  throw new Error("V50 validateThemePack() was not exported by 00-theme.js");
}

const result = sandbox.validateThemePack(themePack);
const report = {
  validationVersion: 1,
  validatorSource: path.basename(themeJsPath),
  valid: result.valid,
  warningCount: result.warnings.length,
  warnings: result.warnings,
  consoleWarningCount: warnings.length,
  passed: result.valid === true && result.warnings.length === 0
};

const outputPath = path.join(assetRoot, "docs", "v50_official_brand_theme_game_validation_v01.json");
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.passed ? 0 : 1;
