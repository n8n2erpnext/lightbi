use crate::model::{DataView, ViewType};
use crate::contract::VisualizationContract;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("View does not meet the expected visualization shape: {0}")]
    ShapeMismatch(String),
}

/// The ViewValidator ensures that a DataView conforms to its requested Visualization Contract.
#[derive(Clone, Default)]
pub struct ViewValidator {}

impl ViewValidator {
    pub fn new() -> Self {
        Self {}
    }

    pub fn validate(&self, view: &DataView) -> Result<(), ValidationError> {
        let contract = VisualizationContract::get_contract(&view.view_type);
        
        // Mock shape validation
        if view.view_type == ViewType::TimeSeries {
            let has_x_axis = view.fields.iter().any(|f| f.role == "X-Axis");
            if !has_x_axis {
                return Err(ValidationError::ShapeMismatch(contract.expected_shape_description));
            }
        }

        Ok(())
    }
}
