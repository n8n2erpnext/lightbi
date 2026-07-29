import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isDev = process.argv.includes("--dev");
const rustHost = () => {
  const version = execFileSync("rustc", ["-vV"], { cwd: repositoryRoot, encoding: "utf8" });
  return version.match(/^host:\s+(.+)$/m)?.[1]?.trim() || "";
};
const targetTriple = process.env.TAURI_ENV_TARGET_TRIPLE
  || process.env.CARGO_BUILD_TARGET
  || rustHost();
const executableSuffix = targetTriple.includes("windows") ? ".exe" : "";
const cargoArgs = ["build", "-p", "lightbi-server"];
if (!isDev) cargoArgs.push("--release");
if (targetTriple) cargoArgs.push("--target", targetTriple);

execFileSync("cargo", cargoArgs, { cwd: repositoryRoot, stdio: "inherit" });

const profile = isDev ? "debug" : "release";
const source = targetTriple
  ? join(repositoryRoot, "target", targetTriple, profile, `lightbi-server${executableSuffix}`)
  : join(repositoryRoot, "target", profile, `lightbi-server${executableSuffix}`);
if (!existsSync(source)) {
  throw new Error(`LightBI sidecar build did not produce ${source}`);
}

const sidecarDirectory = join(repositoryRoot, "crates", "lightbi-tauri", "bin");
mkdirSync(sidecarDirectory, { recursive: true });
const targetName = targetTriple
  ? `lightbi-server-${targetTriple}${executableSuffix}`
  : `lightbi-server${executableSuffix}`;
copyFileSync(source, join(sidecarDirectory, targetName));

// Development launches resolve a sibling binary beside the Tauri executable.
if (isDev) {
  const sibling = join(repositoryRoot, "target", profile, `lightbi-server${executableSuffix}`);
  if (resolve(source) !== resolve(sibling)) copyFileSync(source, sibling);
}
