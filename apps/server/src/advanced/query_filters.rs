//! Advanced workspace internal module. Behavior is preserved from the pre-split facade.

use super::*;

fn split_filter_values(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .take(50)
        .collect()
}

fn push_pg_filter_condition(builder: &mut QueryBuilder<Postgres>, filter: &QueryFilterRequest) {
    let column = quote_pg_identifier(&filter.column);
    let text_column = format!("CAST({column} AS TEXT)");
    match filter.operator {
        FilterOperator::Contains => {
            builder
                .push(text_column)
                .push(" ILIKE ")
                .push_bind(format!("%{}%", filter.value));
        }
        FilterOperator::NotContains => {
            builder
                .push("(")
                .push(text_column)
                .push(" NOT ILIKE ")
                .push_bind(format!("%{}%", filter.value))
                .push(" OR ")
                .push(column)
                .push(" IS NULL)");
        }
        FilterOperator::Equals => {
            builder
                .push(text_column)
                .push(" = ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::NotEquals => {
            builder
                .push("(")
                .push(text_column)
                .push(" <> ")
                .push_bind(filter.value.clone())
                .push(" OR ")
                .push(column)
                .push(" IS NULL)");
        }
        FilterOperator::StartsWith => {
            builder
                .push(text_column)
                .push(" ILIKE ")
                .push_bind(format!("{}%", filter.value));
        }
        FilterOperator::EndsWith => {
            builder
                .push(text_column)
                .push(" ILIKE ")
                .push_bind(format!("%{}", filter.value));
        }
        FilterOperator::GreaterThan => {
            builder
                .push(text_column)
                .push(" > ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::GreaterOrEqual => {
            builder
                .push(text_column)
                .push(" >= ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::LessThan => {
            builder
                .push(text_column)
                .push(" < ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::LessOrEqual => {
            builder
                .push(text_column)
                .push(" <= ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::IsBlank => {
            builder
                .push("(")
                .push(column.clone())
                .push(" IS NULL OR ")
                .push(text_column)
                .push(" = '')");
        }
        FilterOperator::IsNotBlank => {
            builder
                .push("(")
                .push(column.clone())
                .push(" IS NOT NULL AND ")
                .push(text_column)
                .push(" <> '')");
        }
        FilterOperator::In | FilterOperator::NotIn => {
            if matches!(filter.operator, FilterOperator::NotIn) {
                builder.push("(");
            }
            builder
                .push(text_column)
                .push(if matches!(filter.operator, FilterOperator::NotIn) {
                    " NOT IN ("
                } else {
                    " IN ("
                });
            let values = split_filter_values(&filter.value);
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    builder.push(", ");
                }
                builder.push_bind(value.clone());
            }
            if values.is_empty() {
                builder.push_bind(String::new());
            }
            builder.push(")");
            if matches!(filter.operator, FilterOperator::NotIn) {
                builder.push(" OR ").push(column).push(" IS NULL)");
            }
        }
    };
}

pub(super) fn push_pg_filter_node(builder: &mut QueryBuilder<Postgres>, node: &QueryFilterNode) {
    match node {
        QueryFilterNode::Condition(filter) => push_pg_filter_condition(builder, filter),
        QueryFilterNode::Group(group) => {
            builder.push("(");
            for (index, child) in group.children.iter().enumerate() {
                if index > 0 {
                    builder.push(match group.combinator {
                        FilterCombinator::And => " AND ",
                        FilterCombinator::Or => " OR ",
                    });
                }
                push_pg_filter_node(builder, child);
            }
            builder.push(")");
        }
    }
}

fn push_mysql_filter_condition(builder: &mut QueryBuilder<MySql>, filter: &QueryFilterRequest) {
    let column = quote_mysql_identifier(&filter.column);
    let text_column = format!("CAST({column} AS CHAR)");
    match filter.operator {
        FilterOperator::Contains => {
            builder
                .push(text_column)
                .push(" LIKE ")
                .push_bind(format!("%{}%", filter.value));
        }
        FilterOperator::NotContains => {
            builder
                .push("(")
                .push(text_column)
                .push(" NOT LIKE ")
                .push_bind(format!("%{}%", filter.value))
                .push(" OR ")
                .push(column)
                .push(" IS NULL)");
        }
        FilterOperator::Equals => {
            builder
                .push(text_column)
                .push(" = ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::NotEquals => {
            builder
                .push("(")
                .push(text_column)
                .push(" <> ")
                .push_bind(filter.value.clone())
                .push(" OR ")
                .push(column)
                .push(" IS NULL)");
        }
        FilterOperator::StartsWith => {
            builder
                .push(text_column)
                .push(" LIKE ")
                .push_bind(format!("{}%", filter.value));
        }
        FilterOperator::EndsWith => {
            builder
                .push(text_column)
                .push(" LIKE ")
                .push_bind(format!("%{}", filter.value));
        }
        FilterOperator::GreaterThan => {
            builder
                .push(text_column)
                .push(" > ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::GreaterOrEqual => {
            builder
                .push(text_column)
                .push(" >= ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::LessThan => {
            builder
                .push(text_column)
                .push(" < ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::LessOrEqual => {
            builder
                .push(text_column)
                .push(" <= ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::IsBlank => {
            builder
                .push("(")
                .push(column.clone())
                .push(" IS NULL OR ")
                .push(text_column)
                .push(" = '')");
        }
        FilterOperator::IsNotBlank => {
            builder
                .push("(")
                .push(column.clone())
                .push(" IS NOT NULL AND ")
                .push(text_column)
                .push(" <> '')");
        }
        FilterOperator::In | FilterOperator::NotIn => {
            if matches!(filter.operator, FilterOperator::NotIn) {
                builder.push("(");
            }
            builder
                .push(text_column)
                .push(if matches!(filter.operator, FilterOperator::NotIn) {
                    " NOT IN ("
                } else {
                    " IN ("
                });
            let values = split_filter_values(&filter.value);
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    builder.push(", ");
                }
                builder.push_bind(value.clone());
            }
            if values.is_empty() {
                builder.push_bind(String::new());
            }
            builder.push(")");
            if matches!(filter.operator, FilterOperator::NotIn) {
                builder.push(" OR ").push(column).push(" IS NULL)");
            }
        }
    };
}

pub(super) fn push_mysql_filter_node(builder: &mut QueryBuilder<MySql>, node: &QueryFilterNode) {
    match node {
        QueryFilterNode::Condition(filter) => push_mysql_filter_condition(builder, filter),
        QueryFilterNode::Group(group) => {
            builder.push("(");
            for (index, child) in group.children.iter().enumerate() {
                if index > 0 {
                    builder.push(match group.combinator {
                        FilterCombinator::And => " AND ",
                        FilterCombinator::Or => " OR ",
                    });
                }
                push_mysql_filter_node(builder, child);
            }
            builder.push(")");
        }
    }
}

fn push_sqlite_filter_condition(builder: &mut QueryBuilder<Sqlite>, filter: &QueryFilterRequest) {
    let column = quote_sql_identifier(&filter.column);
    let text_column = format!("CAST({column} AS TEXT)");
    match filter.operator {
        FilterOperator::Contains => {
            builder
                .push(text_column)
                .push(" LIKE ")
                .push_bind(format!("%{}%", filter.value));
        }
        FilterOperator::NotContains => {
            builder
                .push("(")
                .push(text_column)
                .push(" NOT LIKE ")
                .push_bind(format!("%{}%", filter.value))
                .push(" OR ")
                .push(column)
                .push(" IS NULL)");
        }
        FilterOperator::Equals => {
            builder
                .push(text_column)
                .push(" = ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::NotEquals => {
            builder
                .push("(")
                .push(text_column)
                .push(" <> ")
                .push_bind(filter.value.clone())
                .push(" OR ")
                .push(column)
                .push(" IS NULL)");
        }
        FilterOperator::StartsWith => {
            builder
                .push(text_column)
                .push(" LIKE ")
                .push_bind(format!("{}%", filter.value));
        }
        FilterOperator::EndsWith => {
            builder
                .push(text_column)
                .push(" LIKE ")
                .push_bind(format!("%{}", filter.value));
        }
        FilterOperator::GreaterThan => {
            builder
                .push(text_column)
                .push(" > ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::GreaterOrEqual => {
            builder
                .push(text_column)
                .push(" >= ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::LessThan => {
            builder
                .push(text_column)
                .push(" < ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::LessOrEqual => {
            builder
                .push(text_column)
                .push(" <= ")
                .push_bind(filter.value.clone());
        }
        FilterOperator::IsBlank => {
            builder
                .push("(")
                .push(column.clone())
                .push(" IS NULL OR ")
                .push(text_column)
                .push(" = '')");
        }
        FilterOperator::IsNotBlank => {
            builder
                .push("(")
                .push(column.clone())
                .push(" IS NOT NULL AND ")
                .push(text_column)
                .push(" <> '')");
        }
        FilterOperator::In | FilterOperator::NotIn => {
            if matches!(filter.operator, FilterOperator::NotIn) {
                builder.push("(");
            }
            builder
                .push(text_column)
                .push(if matches!(filter.operator, FilterOperator::NotIn) {
                    " NOT IN ("
                } else {
                    " IN ("
                });
            let values = split_filter_values(&filter.value);
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    builder.push(", ");
                }
                builder.push_bind(value.clone());
            }
            if values.is_empty() {
                builder.push_bind(String::new());
            }
            builder.push(")");
            if matches!(filter.operator, FilterOperator::NotIn) {
                builder.push(" OR ").push(column).push(" IS NULL)");
            }
        }
    };
}

pub(super) fn push_sqlite_filter_node(builder: &mut QueryBuilder<Sqlite>, node: &QueryFilterNode) {
    match node {
        QueryFilterNode::Condition(filter) => push_sqlite_filter_condition(builder, filter),
        QueryFilterNode::Group(group) => {
            builder.push("(");
            for (index, child) in group.children.iter().enumerate() {
                if index > 0 {
                    builder.push(match group.combinator {
                        FilterCombinator::And => " AND ",
                        FilterCombinator::Or => " OR ",
                    });
                }
                push_sqlite_filter_node(builder, child);
            }
            builder.push(")");
        }
    }
}

pub(super) fn sql_server_filter_group(group: &QueryFilterGroup) -> String {
    let separator = match group.combinator {
        FilterCombinator::And => " AND ",
        FilterCombinator::Or => " OR ",
    };
    format!(
        "({})",
        group
            .children
            .iter()
            .map(sql_server_filter_node)
            .collect::<Vec<_>>()
            .join(separator)
    )
}

fn sql_server_filter_node(node: &QueryFilterNode) -> String {
    match node {
        QueryFilterNode::Condition(filter) => sql_server_filter_condition(filter),
        QueryFilterNode::Group(group) => sql_server_filter_group(group),
    }
}

fn sql_server_filter_condition(filter: &QueryFilterRequest) -> String {
    let column = quote_sql_server_identifier(&filter.column);
    let text_column = format!("CAST({column} AS NVARCHAR(MAX))");
    let value = sql_server_string_literal(&filter.value);
    match filter.operator {
        FilterOperator::Contains => format!(
            "{text_column} LIKE {}",
            sql_server_string_literal(&format!("%{}%", filter.value))
        ),
        FilterOperator::NotContains => format!(
            "({text_column} NOT LIKE {} OR {column} IS NULL)",
            sql_server_string_literal(&format!("%{}%", filter.value))
        ),
        FilterOperator::Equals => format!("{text_column} = {value}"),
        FilterOperator::NotEquals => format!("({text_column} <> {value} OR {column} IS NULL)"),
        FilterOperator::StartsWith => format!(
            "{text_column} LIKE {}",
            sql_server_string_literal(&format!("{}%", filter.value))
        ),
        FilterOperator::EndsWith => format!(
            "{text_column} LIKE {}",
            sql_server_string_literal(&format!("%{}", filter.value))
        ),
        FilterOperator::GreaterThan => format!("{text_column} > {value}"),
        FilterOperator::GreaterOrEqual => format!("{text_column} >= {value}"),
        FilterOperator::LessThan => format!("{text_column} < {value}"),
        FilterOperator::LessOrEqual => format!("{text_column} <= {value}"),
        FilterOperator::IsBlank => format!("({column} IS NULL OR {text_column} = N'')"),
        FilterOperator::IsNotBlank => format!("({column} IS NOT NULL AND {text_column} <> N'')"),
        FilterOperator::In | FilterOperator::NotIn => {
            let values = split_filter_values(&filter.value);
            let values = if values.is_empty() {
                vec![String::new()]
            } else {
                values
            };
            let list = values
                .iter()
                .map(|value| sql_server_string_literal(value))
                .collect::<Vec<_>>()
                .join(", ");
            if matches!(filter.operator, FilterOperator::NotIn) {
                format!("({text_column} NOT IN ({list}) OR {column} IS NULL)")
            } else {
                format!("{text_column} IN ({list})")
            }
        }
    }
}

fn sql_server_string_literal(value: &str) -> String {
    format!("N'{}'", value.replace('\'', "''"))
}
