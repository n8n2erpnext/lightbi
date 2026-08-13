use crate::model::StrategyType;

/// The StrategySelector is responsible for evaluating the context of a recipe
/// (its datasets, semantic bounds, and connector capabilities) and returning
/// the optimal Execution Strategy.
#[derive(Clone, Default)]
pub struct StrategySelector {}

impl StrategySelector {
    pub fn new() -> Self {
        Self {}
    }

    /// Mock function for phase 18 representing capability inspection.
    pub fn determine_strategy(&self, supports_pushdown: bool, requires_live_data: bool) -> StrategyType {
        if supports_pushdown && requires_live_data {
            StrategyType::Pushdown
        } else {
            StrategyType::Cache
        }
    }
}
