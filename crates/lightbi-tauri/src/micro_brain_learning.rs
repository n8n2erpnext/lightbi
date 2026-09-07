use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use flate2::{write::GzEncoder, Compression};
use ring::rand::{SecureRandom, SystemRandom};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{io::Write, path::{Path, PathBuf}, time::Duration};
use tauri::{AppHandle, Manager};
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use tokio_util::io::ReaderStream;

const PACKAGE_PREFIX:&str="mbc-";
const HARD_MAX_BYTES:u64=2*1024*1024*1024;
const MAX_GRANT_SECONDS:u64=900;

#[derive(Debug,Deserialize)]
#[serde(rename_all="camelCase")]
pub(crate) struct StageLearningPackageRequest{pub abstentions:u64,pub generation_id:String,pub app_version:String,pub platform:String,#[serde(default="default_domain")]pub domain:String}
fn default_domain()->String{"cross_domain".to_string()}
#[derive(Debug,Serialize)]
#[serde(rename_all="camelCase")]
pub(crate) struct StagedLearningPackage{pub package_id:String,pub compressed_bytes:u64,pub manifest:Value}
#[derive(Debug,Deserialize)]
#[serde(rename_all="camelCase")]
pub(crate) struct UploadLearningPartRequest{pub package_id:String,pub url:String,pub offset:u64,pub length:u64}
#[derive(Debug,Serialize)]
#[serde(rename_all="camelCase")]
pub(crate) struct UploadLearningPartResult{pub uploaded_bytes:u64,pub etag:String,pub status:u16}

fn safe_token(value:&str,max:usize)->bool{!value.is_empty()&&value.len()<=max&&value.bytes().all(|b|b.is_ascii_alphanumeric()||matches!(b,b'.'|b'-'|b'_'))}
fn valid_package_id(value:&str)->bool{value.starts_with(PACKAGE_PREFIX)&&value.len()>=20&&value.len()<=100&&value[PACKAGE_PREFIX.len()..].bytes().all(|b|b.is_ascii_alphanumeric()||matches!(b,b'-'|b'_'))}
fn outbox(app:&AppHandle)->Result<PathBuf,String>{Ok(app.path().app_cache_dir().map_err(|e|format!("Could not resolve Micro Brain cache: {e}"))?.join("micro-brain-learning").join("outbox"))}
fn package_path(root:&Path,package_id:&str)->Result<PathBuf,String>{if!valid_package_id(package_id){return Err("micro_brain_learning_package_id_invalid".into());}Ok(root.join(format!("{package_id}.ndjson.gz")))}
fn package_id()->Result<String,String>{let mut bytes=[0u8;18];SystemRandom::new().fill(&mut bytes).map_err(|_|"micro_brain_learning_random_failed".to_string())?;Ok(format!("{PACKAGE_PREFIX}{}",URL_SAFE_NO_PAD.encode(bytes)))}
fn validate_stage(input:&StageLearningPackageRequest)->Result<(),String>{if input.abstentions==0{return Err("micro_brain_learning_no_abstention_evidence".into());}if input.abstentions>10_000_000{return Err("micro_brain_learning_count_invalid".into());}for(value,max)in[(&input.generation_id,100),(&input.app_version,40),(&input.platform,60),(&input.domain,96)]{if!safe_token(value,max){return Err("micro_brain_learning_source_identity_invalid".into());}}Ok(())}

#[tauri::command]
pub(crate) async fn stage_micro_brain_learning_package(app:AppHandle,request:StageLearningPackageRequest)->Result<StagedLearningPackage,String>{validate_stage(&request)?;let package_id=package_id()?;let record=json!({"kind":"resolver_summary","state":"abstained","count":request.abstentions});let raw=format!("{}{}\n",serde_json::to_string(&record).map_err(|_|"micro_brain_learning_record_encode_failed")?," ".repeat(1024));let mut encoder=GzEncoder::new(Vec::new(),Compression::default());encoder.write_all(raw.as_bytes()).map_err(|e|format!("Could not compress Micro Brain package: {e}"))?;let compressed=encoder.finish().map_err(|e|format!("Could not finalize Micro Brain package: {e}"))?;if compressed.is_empty()||compressed.len()as u64>HARD_MAX_BYTES{return Err("micro_brain_learning_package_size_invalid".into());}let sha256=format!("{:x}",Sha256::digest(&compressed));let manifest=json!({"schemaVersion":"lightbi.micro-brain.learning-manifest.v1","privacyPolicyVersion":"lightbi.micro-brain.learning-privacy.v1","recordSchemaVersion":"lightbi.micro-brain.learning-record.v1","packageId":package_id,"generatedAt":chrono_like_now(),"source":{"appVersion":request.app_version,"platform":request.platform,"generationId":request.generation_id,"domain":request.domain,"environment":"next_internal_test_only"},"content":{"contentType":"application/x-ndjson","compression":"gzip","sha256":sha256,"compressedBytes":compressed.len(),"uncompressedBytes":raw.as_bytes().len(),"recordCount":1,"evidenceKinds":["resolver_summary"]}});let root=outbox(&app)?;tokio::fs::create_dir_all(&root).await.map_err(|e|format!("Could not create Micro Brain outbox: {e}"))?;let path=package_path(&root,manifest["packageId"].as_str().unwrap())?;tokio::fs::write(&path,&compressed).await.map_err(|e|format!("Could not stage Micro Brain package: {e}"))?;Ok(StagedLearningPackage{package_id:manifest["packageId"].as_str().unwrap().to_string(),compressed_bytes:compressed.len()as u64,manifest})}
fn chrono_like_now()->String{time::OffsetDateTime::now_utc().format(&time::format_description::well_known::Rfc3339).unwrap_or_else(|_|"1970-01-01T00:00:00Z".to_string())}

fn validate_r2_grant(value:&str)->Result<reqwest::Url,String>{let url=reqwest::Url::parse(value).map_err(|_|"micro_brain_learning_upload_url_invalid".to_string())?;if url.scheme()!="https"||!url.username().is_empty()||url.password().is_some()||url.fragment().is_some(){return Err("micro_brain_learning_upload_url_invalid".into());}let host=url.host_str().unwrap_or("");if !host.ends_with(".r2.cloudflarestorage.com"){return Err("micro_brain_learning_upload_host_forbidden".into());}let mut signature=false;let mut expiry=None;for(k,v)in url.query_pairs(){if k=="X-Amz-Signature"{signature=v.len()==64&&v.bytes().all(|b|b.is_ascii_hexdigit());}if k=="X-Amz-Expires"{expiry=v.parse::<u64>().ok();}}if!signature||expiry.is_none()||expiry.unwrap()>MAX_GRANT_SECONDS{return Err("micro_brain_learning_upload_grant_invalid".into());}Ok(url)}

#[tauri::command]
pub(crate) async fn upload_micro_brain_learning_part(app:AppHandle,request:UploadLearningPartRequest)->Result<UploadLearningPartResult,String>{let url=validate_r2_grant(&request.url)?;if request.length==0||request.length>HARD_MAX_BYTES||request.offset.checked_add(request.length).filter(|v|*v<=HARD_MAX_BYTES).is_none(){return Err("micro_brain_learning_upload_range_invalid".into());}let path=package_path(&outbox(&app)?,&request.package_id)?;let metadata=tokio::fs::metadata(&path).await.map_err(|_|"micro_brain_learning_staged_package_missing".to_string())?;if!metadata.is_file()||request.offset+request.length>metadata.len(){return Err("micro_brain_learning_upload_range_invalid".into());}let mut file=tokio::fs::File::open(&path).await.map_err(|e|format!("Could not open Micro Brain package: {e}"))?;file.seek(std::io::SeekFrom::Start(request.offset)).await.map_err(|e|format!("Could not seek Micro Brain package: {e}"))?;let stream=ReaderStream::new(file.take(request.length));let client=reqwest::Client::builder().redirect(reqwest::redirect::Policy::none()).connect_timeout(Duration::from_secs(15)).timeout(Duration::from_secs(20*60)).build().map_err(|e|format!("Could not initialize R2 upload: {e}"))?;let response=client.put(url).header(reqwest::header::CONTENT_LENGTH,request.length).body(reqwest::Body::wrap_stream(stream)).send().await.map_err(|e|format!("Micro Brain R2 upload failed: {e}"))?;let status=response.status().as_u16();if!response.status().is_success(){return Err(format!("micro_brain_learning_r2_upload_http_{status}"));}let etag=response.headers().get(reqwest::header::ETAG).and_then(|v|v.to_str().ok()).unwrap_or("").to_string();if etag.is_empty()||etag.len()>256{return Err("micro_brain_learning_r2_etag_missing".into());}Ok(UploadLearningPartResult{uploaded_bytes:request.length,etag,status})}

#[tauri::command]
pub(crate) async fn discard_micro_brain_learning_package(app:AppHandle,package_id:String)->Result<(),String>{let path=package_path(&outbox(&app)?,&package_id)?;match tokio::fs::remove_file(path).await{Ok(())=>Ok(()),Err(e)if e.kind()==std::io::ErrorKind::NotFound=>Ok(()),Err(e)=>Err(format!("Could not remove Micro Brain package: {e}"))}}

#[cfg(test)]mod tests{use super::*;#[test]fn package_id_and_source_tokens_are_bounded(){assert!(valid_package_id("mbc-abcdefghijklmnop"));assert!(!valid_package_id("mbc-../../secret"));assert!(validate_stage(&StageLearningPackageRequest{abstentions:1,generation_id:"g-2026-09-07-next-046".into(),app_version:"0.9.2-beta.7-next.46".into(),platform:"Win32".into(),domain:"cross_domain".into()}).is_ok());}#[test]fn upload_grant_is_r2_only_and_short_lived(){let good="https://acct.r2.cloudflarestorage.com/bucket/object?X-Amz-Signature=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&X-Amz-Expires=600";assert!(validate_r2_grant(good).is_ok());assert!(validate_r2_grant("https://example.com/?X-Amz-Signature=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&X-Amz-Expires=600").is_err());assert!(validate_r2_grant(&good.replace("600","901")).is_err());}}
