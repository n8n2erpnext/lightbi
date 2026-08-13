use crate::model::{ChartDefinition, ChartType};
use lightbi_view::model::{DataView, ViewType};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ChartValidationError {
    #[error("Chart type {0:?} is incompatible with DataView type {1:?}")]
    IncompatibleView(ChartType, ViewType),
    #[error("Missing required visual mapping: {0}")]
    MissingMapping(String),
}

/// Validates that a Chart Definition is safe to render against a specific DataView
#[derive(Clone, Default)]
pub struct ChartValidator {}

impl ChartValidator {
    pub fn new() -> Self {
        Self {}
    }

    pub fn validate(&self, chart: &ChartDefinition, view: &DataView) -> Result<(), ChartValidationError> {
        // Enforce the Visualization Contract established in `lightbi-view`
        match chart.chart_type {
            ChartType::Line | ChartType::Area => {
                if view.view_type != ViewType::TimeSeries {
                    return Err(ChartValidationError::IncompatibleView(chart.chart_type.clone(), view.view_type.clone()));
                }
            },
            ChartType::Bar | ChartType::Pie => {
                if view.view_type != ViewType::Category {
                    return Err(ChartValidationError::IncompatibleView(chart.chart_type.clone(), view.view_type.clone()));
                }
            },
            ChartType::KPI => {
                if view.view_type != ViewType::KPI {
                    return Err(ChartValidationError::IncompatibleView(chart.chart_type.clone(), view.view_type.clone()));
                }
            },
            ChartType::Table => {
                // Table can typically render anything
            }
        }

        Ok(())
    }
}
