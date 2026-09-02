use serde::Serialize;

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OsPublisherEvidence {
    pub status: &'static str,
    pub platform: &'static str,
    pub signer_thumbprint: Option<String>,
    pub expected_publisher_configured: bool,
    pub reason: String,
}

fn normalize_thumbprint(value: &str) -> Option<String> {
    let normalized: String = value
        .chars()
        .filter(|character| character.is_ascii_hexdigit())
        .map(|character| character.to_ascii_uppercase())
        .collect();
    (normalized.len() == 40).then_some(normalized)
}

fn classify_trusted_thumbprint(
    observed: Option<String>,
    expected_raw: Option<&str>,
) -> OsPublisherEvidence {
    let Some(expected_raw) = expected_raw.filter(|value| !value.trim().is_empty()) else {
        return OsPublisherEvidence {
            status: "unavailable",
            platform: "windows",
            signer_thumbprint: observed,
            expected_publisher_configured: false,
            reason: "expected_publisher_thumbprint_not_configured".to_string(),
        };
    };
    let Some(expected) = normalize_thumbprint(expected_raw) else {
        return OsPublisherEvidence {
            status: "unavailable",
            platform: "windows",
            signer_thumbprint: observed,
            expected_publisher_configured: true,
            reason: "expected_publisher_thumbprint_invalid".to_string(),
        };
    };
    let Some(observed) = observed.and_then(|value| normalize_thumbprint(&value)) else {
        return OsPublisherEvidence {
            status: "unavailable",
            platform: "windows",
            signer_thumbprint: None,
            expected_publisher_configured: true,
            reason: "trusted_signature_signer_thumbprint_unavailable".to_string(),
        };
    };
    let matches = observed == expected;
    OsPublisherEvidence {
        status: if matches { "verified" } else { "not_verified" },
        platform: "windows",
        signer_thumbprint: Some(observed),
        expected_publisher_configured: true,
        reason: if matches {
            "authenticode_trusted_publisher_match"
        } else {
            "authenticode_publisher_thumbprint_mismatch"
        }
        .to_string(),
    }
}

#[cfg(target_os = "windows")]
fn verify_windows_current_executable() -> OsPublisherEvidence {
    use std::{ffi::c_void, mem::size_of, os::windows::ffi::OsStrExt, ptr};
    use windows_sys::Win32::Security::{
        Cryptography::{CertGetCertificateContextProperty, CERT_SHA1_HASH_PROP_ID},
        WinTrust::{
            WTHelperGetProvCertFromChain, WTHelperGetProvSignerFromChain,
            WTHelperProvDataFromStateData, WinVerifyTrust, WINTRUST_ACTION_GENERIC_VERIFY_V2,
            WINTRUST_DATA, WINTRUST_DATA_0, WINTRUST_FILE_INFO, WTD_CACHE_ONLY_URL_RETRIEVAL,
            WTD_CHOICE_FILE, WTD_REVOKE_NONE, WTD_STATEACTION_CLOSE, WTD_STATEACTION_VERIFY,
            WTD_UI_NONE,
        },
    };

    let path = match std::env::current_exe() {
        Ok(path) => path,
        Err(error) => {
            return OsPublisherEvidence {
                status: "unavailable",
                platform: "windows",
                signer_thumbprint: None,
                expected_publisher_configured: option_env!("LIGHTBI_WINDOWS_PUBLISHER_THUMBPRINT")
                    .is_some(),
                reason: format!("current_executable_unavailable:{error}"),
            };
        }
    };
    let wide_path: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let mut file_info: WINTRUST_FILE_INFO = unsafe { std::mem::zeroed() };
    file_info.cbStruct = size_of::<WINTRUST_FILE_INFO>() as u32;
    file_info.pcwszFilePath = wide_path.as_ptr();
    file_info.hFile = ptr::null_mut();
    file_info.pgKnownSubject = ptr::null_mut();

    let mut trust_data: WINTRUST_DATA = unsafe { std::mem::zeroed() };
    trust_data.cbStruct = size_of::<WINTRUST_DATA>() as u32;
    trust_data.dwUIChoice = WTD_UI_NONE;
    trust_data.fdwRevocationChecks = WTD_REVOKE_NONE;
    trust_data.dwUnionChoice = WTD_CHOICE_FILE;
    trust_data.Anonymous = WINTRUST_DATA_0 {
        pFile: &mut file_info,
    };
    trust_data.dwStateAction = WTD_STATEACTION_VERIFY;
    trust_data.dwProvFlags = WTD_CACHE_ONLY_URL_RETRIEVAL;

    let mut action = WINTRUST_ACTION_GENERIC_VERIFY_V2;
    let verify_result = unsafe {
        WinVerifyTrust(
            ptr::null_mut(),
            &mut action,
            (&mut trust_data as *mut WINTRUST_DATA).cast::<c_void>(),
        )
    };

    let evidence = if verify_result != 0 {
        OsPublisherEvidence {
            status: "not_verified",
            platform: "windows",
            signer_thumbprint: None,
            expected_publisher_configured: option_env!("LIGHTBI_WINDOWS_PUBLISHER_THUMBPRINT")
                .is_some(),
            reason: format!("winverifytrust_failed:0x{:08X}", verify_result as u32),
        }
    } else {
        let thumbprint = unsafe {
            let provider = WTHelperProvDataFromStateData(trust_data.hWVTStateData);
            if provider.is_null() {
                None
            } else {
                let signer = WTHelperGetProvSignerFromChain(provider, 0, 0, 0);
                if signer.is_null() {
                    None
                } else {
                    let provider_cert = WTHelperGetProvCertFromChain(signer, 0);
                    if provider_cert.is_null() || (*provider_cert).pCert.is_null() {
                        None
                    } else {
                        let context = (*provider_cert).pCert;
                        let mut length = 0u32;
                        if CertGetCertificateContextProperty(
                            context,
                            CERT_SHA1_HASH_PROP_ID,
                            ptr::null_mut(),
                            &mut length,
                        ) == 0
                            || length == 0
                        {
                            None
                        } else {
                            let mut bytes = vec![0u8; length as usize];
                            if CertGetCertificateContextProperty(
                                context,
                                CERT_SHA1_HASH_PROP_ID,
                                bytes.as_mut_ptr().cast::<c_void>(),
                                &mut length,
                            ) == 0
                            {
                                None
                            } else {
                                bytes.truncate(length as usize);
                                Some(bytes.iter().map(|byte| format!("{byte:02X}")).collect())
                            }
                        }
                    }
                }
            }
        };
        classify_trusted_thumbprint(
            thumbprint,
            option_env!("LIGHTBI_WINDOWS_PUBLISHER_THUMBPRINT"),
        )
    };

    trust_data.dwStateAction = WTD_STATEACTION_CLOSE;
    unsafe {
        let _ = WinVerifyTrust(
            ptr::null_mut(),
            &mut action,
            (&mut trust_data as *mut WINTRUST_DATA).cast::<c_void>(),
        );
    }
    evidence
}

pub fn current_os_publisher_evidence() -> OsPublisherEvidence {
    #[cfg(target_os = "windows")]
    {
        return verify_windows_current_executable();
    }
    #[cfg(not(target_os = "windows"))]
    {
        OsPublisherEvidence {
            status: "not_applicable",
            platform: std::env::consts::OS,
            signer_thumbprint: None,
            expected_publisher_configured: false,
            reason: "windows_authenticode_not_applicable".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const A: &str = "0123456789ABCDEF0123456789ABCDEF01234567";
    const B: &str = "89ABCDEF0123456789ABCDEF0123456789ABCDEF";

    #[test]
    fn normalizes_thumbprints_without_weakening_exact_identity() {
        assert_eq!(
            normalize_thumbprint("01:23 45-67 89 ab cd ef 01 23 45 67 89 ab cd ef 01 23 45 67"),
            Some(A.to_string())
        );
        assert_eq!(normalize_thumbprint("1234"), None);
    }

    #[test]
    fn trusted_signature_stays_unavailable_without_expected_lightbi_identity() {
        let evidence = classify_trusted_thumbprint(Some(A.to_string()), None);
        assert_eq!(evidence.status, "unavailable");
        assert!(!evidence.expected_publisher_configured);
    }

    #[test]
    fn exact_thumbprint_match_is_required_for_verified() {
        let verified = classify_trusted_thumbprint(Some(A.to_string()), Some(A));
        assert_eq!(verified.status, "verified");
        let mismatch = classify_trusted_thumbprint(Some(B.to_string()), Some(A));
        assert_eq!(mismatch.status, "not_verified");
    }
}
