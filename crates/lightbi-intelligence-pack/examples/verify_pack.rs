use lightbi_intelligence_pack::{verify_pack_bytes, CompatibilityContext, TrustedKey};
use std::{env, fs};

fn main() -> Result<(), String> {
    let args = env::args().collect::<Vec<_>>();
    if args.len() != 4 {
        return Err("usage: verify_pack <pack.json> <key-id> <public-key-base64url>".to_string());
    }
    let raw = fs::read(&args[1]).map_err(|error| format!("read_failed:{error}"))?;
    let context = CompatibilityContext {
        core_version: "0.9.2-beta.7",
        brain_index_schema_version: "lightbi.micro-brain.index.v1",
        registry_schema_version: "lightbi.semantic-registry.v1",
        feature_contracts: &[
            "evidence_bound_analysis_authority_v1",
            "micro_brain_index_v1",
        ],
    };
    let verified = verify_pack_bytes(
        &raw,
        &context,
        &[TrustedKey {
            key_id: &args[2],
            public_key_base64_url: &args[3],
        }],
    )?;
    println!("pack_version={}", verified.envelope.manifest.pack_version);
    println!("envelope_sha256={}", verified.envelope_sha256);
    println!(
        "payload_sha256={}",
        verified.envelope.manifest.payload_sha256
    );
    println!("payload_bytes={}", verified.payload.len());
    Ok(())
}
