/**
 * `email build` copies the preview server into `.react-email` and installs
 * its own dependencies. preview-server 5.0.7 pins framer-motion@12.23.22,
 * which depends on motion-dom@^12.23.21. Latest motion-dom 12.x removed
 * `activeAnimations`, so webpack fails unless we pin a compatible version
 * on that isolated install.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const MOTION_DOM_PIN = "12.23.21";
const require = createRequire(import.meta.url);

const reactEmailDir = path.dirname(require.resolve("react-email/package.json"));
const buildSourcePath = path.join(reactEmailDir, "dist/index.js");
const source = fs.readFileSync(buildSourcePath, "utf8");

if (!source.includes(`"motion-dom": "${MOTION_DOM_PIN}"`)) {
  const needle =
    '\tdelete packageJson.scripts.prepare;\n\tawait fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson), "utf8");';
  const inject = `\tdelete packageJson.scripts.prepare;
\tpackageJson.overrides = { ...packageJson.overrides, "motion-dom": "${MOTION_DOM_PIN}" };
\tawait fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson), "utf8");`;

  if (!source.includes(needle)) {
    throw new Error(
      `react-email updatePackageJson shape changed; update ${path.relative(process.cwd(), import.meta.path)}`,
    );
  }

  fs.writeFileSync(buildSourcePath, source.replace(needle, inject));
}

const result = spawnSync("email", ["build"], {
  stdio: "inherit",
  cwd: path.join(import.meta.dir, ".."),
  shell: true,
});

process.exit(result.status ?? 1);
