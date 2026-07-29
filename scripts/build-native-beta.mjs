import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const explicitTarget = process.argv.find((argument) => argument.startsWith("--target="))?.split("=")[1];
const defaultTarget = process.platform === "win32"
  ? "x86_64-pc-windows-msvc"
  : "x86_64-pc-windows-gnu";
const target = explicitTarget || process.env.LIGHTBI_WINDOWS_TARGET || defaultTarget;

execFileSync("cargo", ["tauri", "build", "--target", target], {
  cwd: join(repositoryRoot, "crates", "lightbi-tauri"),
  env: { ...process.env, CARGO_BUILD_TARGET: target },
  stdio: "inherit",
});

const installerDirectory = join(repositoryRoot, "target", target, "release", "bundle", "nsis");
if (!existsSync(installerDirectory)) {
  throw new Error(`Native build completed without an NSIS output directory: ${installerDirectory}`);
}
const tauriConfig = JSON.parse(readFileSync(
  join(repositoryRoot, "crates", "lightbi-tauri", "tauri.conf.json"),
  "utf8",
));
const installers = readdirSync(installerDirectory)
  .filter((name) => name.toLowerCase().endsWith(".exe") && name.includes(`_${tauriConfig.version}_`))
  .map((name) => join(installerDirectory, name));
if (installers.length === 0) {
  throw new Error(`Native build completed without an NSIS installer in ${installerDirectory}`);
}

for (const installer of installers) {
  const bytes = readFileSync(installer);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  process.stdout.write(`${JSON.stringify({
    installer,
    bytes: statSync(installer).size,
    sha256,
    target,
  })}\n`);
}
