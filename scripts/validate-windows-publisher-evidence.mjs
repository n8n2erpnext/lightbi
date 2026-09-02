import { readFileSync } from "node:fs";
import { validateWindowsPublisherEvidence } from "./lib/windows-publisher-evidence.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((value, index, all) => value.startsWith("--") ? [value.slice(2), all[index + 1]] : null).filter(Boolean));
if (!args.evidence) throw new Error("Missing --evidence");
const evidence = JSON.parse(readFileSync(args.evidence, "utf8"));
const validated = validateWindowsPublisherEvidence(evidence, {
  mode: args.mode || "beta",
  expectedSha256: args["expected-sha256"] || null,
  expectedSubject: args["expected-subject"] || null,
});
console.log(`windows_publisher_evidence=pass mode=${args.mode || "beta"} status=${validated.signature_status} subject=${validated.signer_subject || "none"}`);
