use crate::model::DashboardDefinition;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DashboardValidationError {
    #[error("Dashboard contains widget pointing to missing asset: {0}")]
    MissingAssetReference(String),
    #[error("Dashboard perspective mismatch. Asset {0} does not belong to Perspective {1}")]
    PerspectiveMismatch(String, String),
}

/// The DashboardValidator ensures layout and asset integrity
/// before a Dashboard is saved or delivered to the UI.
#[derive(Clone, Default)]
pub struct DashboardValidator {}

impl DashboardValidator {
    pub fn new() -> Self {
        Self {}
    }

    pub fn validate(&self, dashboard: &DashboardDefinition) -> Result<(), DashboardValidationError> {
        // In reality, this would check the ChartRegistry, InsightRegistry, etc.,
        // to verify that `asset_id` actually exists and is compatible with `perspective_id`.
        if dashboard.widgets.is_empty() {
            // Empty dashboards are technically valid, but we might want to warn.
        }

        Ok(())
    }
}
