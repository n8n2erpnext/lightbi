import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isDev = process.argv.includes("--dev");
const runtimeOnly = process.argv.includes("--runtime-only");
const rustHost = () => {
  const version = execFileSync("rustc", ["-vV"], { cwd: repositoryRoot, encoding: "utf8" });
  return version.match(/^host:\s+(.+)$/m)?.[1]?.trim() || "";
};
const targetTriple = process.env.TAURI_ENV_TARGET_TRIPLE
  || process.env.CARGO_BUILD_TARGET
  || rustHost();
const executableSuffix = targetTriple.includes("windows") ? ".exe" : "";
const profile = isDev ? "debug" : "release";
const sidecarDirectory = join(repositoryRoot, "crates", "lightbi-tauri", "bin");
mkdirSync(sidecarDirectory, { recursive: true });
let sidecarSource = "";
if (!runtimeOnly) {
  const cargoArgs = ["build", "-p", "lightbi-server"];
  if (!isDev) cargoArgs.push("--release");
  if (targetTriple) cargoArgs.push("--target", targetTriple);
  execFileSync("cargo", cargoArgs, { cwd: repositoryRoot, stdio: "inherit" });
  sidecarSource = targetTriple
    ? join(repositoryRoot, "target", targetTriple, profile, `lightbi-server${executableSuffix}`)
    : join(repositoryRoot, "target", profile, `lightbi-server${executableSuffix}`);
  if (!existsSync(sidecarSource)) {
    throw new Error(`LightBI sidecar build did not produce ${sidecarSource}`);
  }
  const targetName = targetTriple
    ? `lightbi-server-${targetTriple}${executableSuffix}`
    : `lightbi-server${executableSuffix}`;
  copyFileSync(sidecarSource, join(sidecarDirectory, targetName));
}

// Rust's Windows GNU target links the GCC runtime dynamically. Tauri bundles
// these files beside the app/sidecar so a clean Windows machine never needs a
// separate MinGW installation.
if (targetTriple.includes("windows-gnu")) {
  const compiler = process.env.CC_x86_64_pc_windows_gnu
    || process.env.CC_X86_64_PC_WINDOWS_GNU
    || "x86_64-w64-mingw32-gcc";
  const runtimeDlls = [
    "libstdc++-6.dll",
    "libgcc_s_seh-1.dll",
    "libwinpthread-1.dll",
  ];
  for (const dll of runtimeDlls) {
    const resolved = execFileSync(compiler, [`-print-file-name=${dll}`], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
    if (!resolved || resolved === dll || !existsSync(resolved)) {
      throw new Error(`${compiler} could not resolve required Windows runtime ${dll}`);
    }
    copyFileSync(resolved, join(sidecarDirectory, dll));
  }
}

// Development launches resolve a sibling binary beside the Tauri executable.
if (isDev && !runtimeOnly) {
  const sibling = join(repositoryRoot, "target", profile, `lightbi-server${executableSuffix}`);
  if (resolve(sidecarSource) !== resolve(sibling)) copyFileSync(sidecarSource, sibling);
}
