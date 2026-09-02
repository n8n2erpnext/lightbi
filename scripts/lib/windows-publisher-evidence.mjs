const shaPattern = /^[a-f0-9]{64}$/;

export function validateWindowsPublisherEvidence(input, options = {}) {
  if (!input || input.schema_version !== "lightbi.windows-publisher-evidence.v1") throw new Error("invalid_windows_publisher_evidence_schema");
  if (!input.artifact || !shaPattern.test(String(input.sha256 || "").toLowerCase())) throw new Error("invalid_windows_publisher_evidence_artifact");

  const normalized = {
    ...input,
    sha256: String(input.sha256).toLowerCase(),
    signature_status: String(input.signature_status || "Unknown"),
    signer_subject: input.signer_subject ? String(input.signer_subject) : null,
    signer_thumbprint: input.signer_thumbprint ? String(input.signer_thumbprint).toUpperCase() : null,
  };

  if (options.expectedSha256 && normalized.sha256 !== String(options.expectedSha256).toLowerCase()) throw new Error("windows_publisher_evidence_sha_mismatch");
  const mode = options.mode || "beta";
  if (!new Set(["beta", "stable"]).has(mode)) throw new Error("invalid_windows_publisher_evidence_mode");

  if (mode === "stable") {
    if (normalized.signature_status !== "Valid") throw new Error("windows_authenticode_signature_not_valid");
    if (!options.expectedSubject) throw new Error("windows_publisher_expected_subject_required");
    if (normalized.signer_subject !== options.expectedSubject) throw new Error("windows_publisher_subject_mismatch");
  }

  return normalized;
}
