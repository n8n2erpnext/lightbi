fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        // DuckDB uses the Windows Restart Manager when opening files.
        // MSVC links this transitively in common toolchains; MinGW needs it explicit.
        println!("cargo:rustc-link-lib=rstrtmgr");
    }
}
