use tauri::{plugin::{Builder, TauriPlugin}, Runtime, Url};

pub fn allows_embedded_navigation(url: &Url) -> bool {
    match url.scheme() {
        "tauri" | "lightbi" | "about" | "data" | "blob" => true,
        "http" | "https" => matches!(
            url.host_str(),
            Some("tauri.localhost" | "lightbi.localhost" | "localhost" | "127.0.0.1")
        ),
        _ => false,
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("lightbi-navigation-guard")
        .on_navigation(|_webview, url| allows_embedded_navigation(url))
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn permits_only_embedded_app_navigation() {
        for url in ["http://tauri.localhost/", "http://lightbi.localhost/api", "tauri://localhost/", "lightbi://localhost/"] {
            assert!(allows_embedded_navigation(&Url::parse(url).unwrap()), "expected allowed: {url}");
        }
        for url in ["https://lightbi.thaiduy.digital/docs", "https://example.com/", "http://example.com/"] {
            assert!(!allows_embedded_navigation(&Url::parse(url).unwrap()), "expected blocked: {url}");
        }
    }
}
