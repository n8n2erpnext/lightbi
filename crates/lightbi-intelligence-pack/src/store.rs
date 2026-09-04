use crate::{
    sha256_hex, valid_sha256, verify_pack_bytes, CompatibilityContext, PackPointerV1, PackStateV1,
    ReconciledPack, TrustedKey, VerifiedPack, PACK_STATE_SCHEMA_VERSION,
};
use semver::Version;
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

fn pointer_from_verified(pack: &VerifiedPack) -> PackPointerV1 {
    PackPointerV1 {
        pack_version: pack.envelope.manifest.pack_version.clone(),
        object_sha256: pack.envelope_sha256.clone(),
        payload_sha256: pack.envelope.manifest.payload_sha256.clone(),
        signing_key_id: pack.envelope.manifest.signing_key_id.clone(),
    }
}

fn temp_path(path: &Path) -> Result<PathBuf, String> {
    let parent = path
        .parent()
        .ok_or_else(|| "pack_state_parent_missing".to_string())?;
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "pack_state_filename_invalid".to_string())?;
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "pack_clock_invalid".to_string())?
        .as_nanos();
    Ok(parent.join(format!(".{file_name}.tmp-{}-{nanos}", std::process::id())))
}

#[cfg(unix)]
fn replace_file(source: &Path, target: &Path) -> Result<(), String> {
    fs::rename(source, target).map_err(|error| format!("pack_atomic_replace_failed:{error}"))
}

#[cfg(windows)]
fn replace_file(source: &Path, target: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };
    let source_wide = source
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let target_wide = target
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let result = unsafe {
        MoveFileExW(
            source_wide.as_ptr(),
            target_wide.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if result == 0 {
        return Err(format!(
            "pack_atomic_replace_failed:{}",
            std::io::Error::last_os_error()
        ));
    }
    Ok(())
}

#[cfg(not(any(unix, windows)))]
fn replace_file(source: &Path, target: &Path) -> Result<(), String> {
    if target.exists() {
        fs::remove_file(target).map_err(|error| format!("pack_state_remove_failed:{error}"))?;
    }
    fs::rename(source, target).map_err(|error| format!("pack_atomic_replace_failed:{error}"))
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "pack_state_parent_missing".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("pack_directory_create_failed:{error}"))?;
    let temp = temp_path(path)?;
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temp)
        .map_err(|error| format!("pack_temp_create_failed:{error}"))?;
    if let Err(error) = file.write_all(bytes).and_then(|_| file.sync_all()) {
        let _ = fs::remove_file(&temp);
        return Err(format!("pack_temp_sync_failed:{error}"));
    }
    drop(file);
    if let Err(error) = replace_file(&temp, path) {
        let _ = fs::remove_file(&temp);
        return Err(error);
    }
    #[cfg(unix)]
    if let Ok(directory) = File::open(parent) {
        let _ = directory.sync_all();
    }
    Ok(())
}

#[derive(Debug, Clone)]
pub struct PackStore {
    root: PathBuf,
}

impl PackStore {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    fn objects_dir(&self) -> PathBuf {
        self.root.join("objects")
    }

    fn state_path(&self) -> PathBuf {
        self.root.join("state.json")
    }

    pub fn read_state(&self) -> Result<PackStateV1, String> {
        match fs::read(self.state_path()) {
            Ok(bytes) => {
                let state: PackStateV1 = serde_json::from_slice(&bytes)
                    .map_err(|error| format!("pack_state_invalid:{error}"))?;
                if state.schema_version != PACK_STATE_SCHEMA_VERSION {
                    return Err("pack_state_schema_incompatible".to_string());
                }
                Ok(state)
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                Ok(PackStateV1::default())
            }
            Err(error) => Err(format!("pack_state_read_failed:{error}")),
        }
    }

    fn write_state(&self, state: &PackStateV1) -> Result<(), String> {
        let bytes = serde_json::to_vec_pretty(state)
            .map_err(|error| format!("pack_state_serialize_failed:{error}"))?;
        atomic_write(&self.state_path(), &bytes)
    }

    fn object_path(&self, object_sha256: &str) -> Result<PathBuf, String> {
        if !valid_sha256(object_sha256) {
            return Err("pack_object_identity_invalid".to_string());
        }
        Ok(self
            .objects_dir()
            .join(format!("{}.json", object_sha256.to_ascii_lowercase())))
    }

    fn verified_pointer(
        &self,
        pointer: &PackPointerV1,
        context: &CompatibilityContext<'_>,
        keys: &[TrustedKey<'_>],
    ) -> Result<VerifiedPack, String> {
        let raw = fs::read(self.object_path(&pointer.object_sha256)?)
            .map_err(|_| "pack_object_missing".to_string())?;
        if sha256_hex(&raw) != pointer.object_sha256.to_ascii_lowercase() {
            return Err("pack_object_digest_mismatch".to_string());
        }
        let verified = verify_pack_bytes(&raw, context, keys)?;
        let expected = pointer_from_verified(&verified);
        if &expected != pointer {
            return Err("pack_pointer_identity_mismatch".to_string());
        }
        Ok(verified)
    }

    pub fn stage(
        &self,
        raw: &[u8],
        expected_envelope_sha256: Option<&str>,
        context: &CompatibilityContext<'_>,
        keys: &[TrustedKey<'_>],
    ) -> Result<PackPointerV1, String> {
        let verified = verify_pack_bytes(raw, context, keys)?;
        if let Some(expected) = expected_envelope_sha256 {
            if !valid_sha256(expected) || verified.envelope_sha256 != expected.to_ascii_lowercase()
            {
                return Err("pack_envelope_digest_mismatch".to_string());
            }
        }
        let mut state = self.read_state()?;
        let next = Version::parse(&verified.envelope.manifest.pack_version)
            .map_err(|_| "pack_version_invalid".to_string())?;
        if let Some(active) = &state.active {
            let current = Version::parse(&active.pack_version)
                .map_err(|_| "pack_active_version_invalid".to_string())?;
            if next <= current {
                return Err("pack_version_not_newer_than_active".to_string());
            }
        }
        if let Some(floor) = &state.accepted_version_floor {
            let accepted = Version::parse(floor)
                .map_err(|_| "pack_accepted_version_floor_invalid".to_string())?;
            if next <= accepted {
                return Err("pack_version_not_newer_than_accepted_floor".to_string());
            }
        }
        let pointer = pointer_from_verified(&verified);
        fs::create_dir_all(self.objects_dir())
            .map_err(|error| format!("pack_objects_create_failed:{error}"))?;
        let object = self.object_path(&pointer.object_sha256)?;
        if object.exists() {
            let existing =
                fs::read(&object).map_err(|error| format!("pack_object_read_failed:{error}"))?;
            if sha256_hex(&existing) != pointer.object_sha256 {
                return Err("pack_existing_object_corrupt".to_string());
            }
        } else {
            atomic_write(&object, raw)?;
        }
        state.staged = Some(pointer.clone());
        self.write_state(&state)?;
        Ok(pointer)
    }

    pub fn staged_payload(
        &self,
        context: &CompatibilityContext<'_>,
        keys: &[TrustedKey<'_>],
    ) -> Result<Option<Vec<u8>>, String> {
        let state = self.read_state()?;
        state
            .staged
            .as_ref()
            .map(|pointer| {
                self.verified_pointer(pointer, context, keys)
                    .map(|pack| pack.payload)
            })
            .transpose()
    }

    pub fn activate_staged(
        &self,
        context: &CompatibilityContext<'_>,
        keys: &[TrustedKey<'_>],
    ) -> Result<PackPointerV1, String> {
        let mut state = self.read_state()?;
        let staged = state
            .staged
            .clone()
            .ok_or_else(|| "pack_staging_empty".to_string())?;
        self.verified_pointer(&staged, context, keys)?;
        state.previous = state.active.clone();
        state.active = Some(staged.clone());
        state.staged = None;
        state.accepted_version_floor = Some(staged.pack_version.clone());
        self.write_state(&state)?;
        Ok(staged)
    }

    pub fn rollback(
        &self,
        context: &CompatibilityContext<'_>,
        keys: &[TrustedKey<'_>],
    ) -> Result<PackPointerV1, String> {
        let mut state = self.read_state()?;
        let previous = state
            .previous
            .clone()
            .ok_or_else(|| "pack_previous_empty".to_string())?;
        self.verified_pointer(&previous, context, keys)?;
        let current = state.active.clone();
        state.active = Some(previous.clone());
        state.previous = current;
        state.staged = None;
        self.write_state(&state)?;
        Ok(previous)
    }

    pub fn reconcile(
        &self,
        context: &CompatibilityContext<'_>,
        keys: &[TrustedKey<'_>],
    ) -> Result<ReconciledPack, String> {
        let mut state = match self.read_state() {
            Ok(state) => state,
            Err(error)
                if error.starts_with("pack_state_invalid:")
                    || error == "pack_state_schema_incompatible" =>
            {
                let repaired = PackStateV1::default();
                self.write_state(&repaired)?;
                return Ok(ReconciledPack {
                    source: "bundled",
                    pack_version: None,
                    payload_sha256: None,
                    signing_key_id: None,
                    payload: None,
                    repaired: true,
                    limitation: Some(format!("state_rejected:{error}")),
                });
            }
            Err(error) => return Err(error),
        };
        if let Some(active) = state.active.clone() {
            match self.verified_pointer(&active, context, keys) {
                Ok(pack) => {
                    return Ok(ReconciledPack {
                        source: "active",
                        pack_version: Some(active.pack_version),
                        payload_sha256: Some(active.payload_sha256),
                        signing_key_id: Some(active.signing_key_id),
                        payload: Some(pack.payload),
                        repaired: false,
                        limitation: None,
                    });
                }
                Err(active_error) => {
                    if let Some(previous) = state.previous.clone() {
                        if let Ok(pack) = self.verified_pointer(&previous, context, keys) {
                            state.active = Some(previous.clone());
                            state.previous = None;
                            state.staged = None;
                            self.write_state(&state)?;
                            return Ok(ReconciledPack {
                                source: "previous",
                                pack_version: Some(previous.pack_version),
                                payload_sha256: Some(previous.payload_sha256),
                                signing_key_id: Some(previous.signing_key_id),
                                payload: Some(pack.payload),
                                repaired: true,
                                limitation: Some(format!("active_pack_rejected:{active_error}")),
                            });
                        }
                    }
                    state.active = None;
                    state.previous = None;
                    state.staged = None;
                    self.write_state(&state)?;
                    return Ok(ReconciledPack {
                        source: "bundled",
                        pack_version: None,
                        payload_sha256: None,
                        signing_key_id: None,
                        payload: None,
                        repaired: true,
                        limitation: Some(format!("active_pack_rejected:{active_error}")),
                    });
                }
            }
        }
        Ok(ReconciledPack {
            source: "bundled",
            pack_version: None,
            payload_sha256: None,
            signing_key_id: None,
            payload: None,
            repaired: false,
            limitation: None,
        })
    }
}
