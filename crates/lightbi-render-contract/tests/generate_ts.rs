#[test]
fn generate_typescript_bindings() {
    // This test ensures `ts-rs` runs and generates the bindings
    // during `cargo test`.
    // We explicitly call the export methods.
    use lightbi_render_contract::payloads::{
        ChartPayload, DashboardPayload, InsightPayload, ExportPayload, WidgetPayload, PayloadVersion,
    };
    use ts_rs::TS;

    // By default, ts-rs writes to the `bindings/` directory at the root of the workspace.
    // If we want to move them later, we can script it in a build step.
    assert!(ChartPayload::export().is_ok());
    assert!(DashboardPayload::export().is_ok());
    assert!(InsightPayload::export().is_ok());
    assert!(ExportPayload::export().is_ok());
    assert!(WidgetPayload::export().is_ok());
    assert!(PayloadVersion::export().is_ok());
}
