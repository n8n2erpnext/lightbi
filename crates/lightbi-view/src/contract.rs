use crate::model::ViewType;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualizationContract {
    pub view_type: ViewType,
    pub expected_shape_description: String,
    pub supported_visualizations: Vec<String>,
}

impl VisualizationContract {
    pub fn get_contract(view_type: &ViewType) -> Self {
        match view_type {
            ViewType::TimeSeries => VisualizationContract {
                view_type: ViewType::TimeSeries,
                expected_shape_description: "Requires exactly 1 Date/Time Dimension and at least 1 Measure".to_string(),
                supported_visualizations: vec!["LineChart".to_string(), "AreaChart".to_string()],
            },
            ViewType::Category => VisualizationContract {
                view_type: ViewType::Category,
                expected_shape_description: "Requires exactly 1 Categorical Dimension and 1 Measure".to_string(),
                supported_visualizations: vec!["BarChart".to_string(), "PieChart".to_string()],
            },
            _ => VisualizationContract {
                view_type: view_type.clone(),
                expected_shape_description: "Generic tabular shape".to_string(),
                supported_visualizations: vec!["Table".to_string()],
            }
        }
    }
}
