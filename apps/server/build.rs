fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        // DuckDB uses the Windows Restart Manager when opening files.
        // MinGW needs the import library after DuckDB's static archive.
        if std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("gnu") {
            println!("cargo:rustc-link-arg-bin=lightbi-server=-lrstrtmgr");
        } else {
            println!("cargo:rustc-link-lib=rstrtmgr");
        }
    }
}
