#[tokio::main]
async fn main() {
    let bind_address = std::env::var("LIGHTBI_BIND_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:5172".to_string());
    lightbi_server::run(&bind_address)
        .await
        .expect("LightBI server stopped unexpectedly");
}
