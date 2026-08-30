//! Provider value conversion for Advanced query results.

use super::*;

pub(super) fn sql_server_cell(value: &SqlServerColumnData<'static>) -> Value {
    match value {
        SqlServerColumnData::U8(value) => value.map(|value| json!(value)).unwrap_or(Value::Null),
        SqlServerColumnData::I16(value) => value.map(|value| json!(value)).unwrap_or(Value::Null),
        SqlServerColumnData::I32(value) => value.map(|value| json!(value)).unwrap_or(Value::Null),
        SqlServerColumnData::I64(value) => value.map(|value| json!(value)).unwrap_or(Value::Null),
        SqlServerColumnData::F32(value) => value.map(|value| json!(value)).unwrap_or(Value::Null),
        SqlServerColumnData::F64(value) => value.map(|value| json!(value)).unwrap_or(Value::Null),
        SqlServerColumnData::Bit(value) => value.map(|value| json!(value)).unwrap_or(Value::Null),
        SqlServerColumnData::String(value) => value
            .as_ref()
            .map(|value| json!(value.as_ref()))
            .unwrap_or(Value::Null),
        SqlServerColumnData::Guid(value) => value
            .map(|value| json!(value.to_string()))
            .unwrap_or(Value::Null),
        SqlServerColumnData::Binary(value) => value
            .as_ref()
            .map(|value| json!(format!("{:02x?}", value.as_ref())))
            .unwrap_or(Value::Null),
        SqlServerColumnData::Numeric(value) => value
            .as_ref()
            .map(|value| json!(value.to_string()))
            .unwrap_or(Value::Null),
        SqlServerColumnData::Xml(value) => value
            .as_ref()
            .map(|value| json!(value.to_string()))
            .unwrap_or(Value::Null),
        SqlServerColumnData::DateTime(_)
        | SqlServerColumnData::SmallDateTime(_)
        | SqlServerColumnData::DateTime2(_) => {
            sql_server_temporal_cell::<chrono::NaiveDateTime>(value, |value| {
                value.format("%Y-%m-%dT%H:%M:%S%.f").to_string()
            })
        }
        SqlServerColumnData::Date(_) => {
            sql_server_temporal_cell::<chrono::NaiveDate>(value, |value| {
                value.format("%Y-%m-%d").to_string()
            })
        }
        SqlServerColumnData::Time(_) => {
            sql_server_temporal_cell::<chrono::NaiveTime>(value, |value| {
                value.format("%H:%M:%S%.f").to_string()
            })
        }
        SqlServerColumnData::DateTimeOffset(_) => sql_server_temporal_cell::<
            chrono::DateTime<chrono::FixedOffset>,
        >(value, |value| value.to_rfc3339()),
    }
}

fn sql_server_temporal_cell<T>(
    value: &SqlServerColumnData<'static>,
    format: impl FnOnce(T) -> String,
) -> Value
where
    T: for<'a> tiberius::FromSql<'a>,
{
    match T::from_sql(value) {
        Ok(Some(value)) => Value::String(format(value)),
        Ok(None) => Value::Null,
        Err(error) => Value::String(format!("SQL Server temporal conversion failed: {error}")),
    }
}

pub(super) fn logical_type_mysql(native: &str) -> &'static str {
    let native = native.to_ascii_uppercase();
    if native.contains("INT")
        || native.contains("DECIMAL")
        || native.contains("FLOAT")
        || native.contains("DOUBLE")
    {
        "number"
    } else if native.contains("DATE") || native.contains("TIME") || native.contains("YEAR") {
        "date"
    } else if native.contains("BOOL") || native == "TINYINT" {
        "boolean"
    } else {
        "string"
    }
}

pub(super) fn logical_type_sqlite(native: &str) -> &'static str {
    match native.to_ascii_uppercase().as_str() {
        "INTEGER" | "REAL" | "NUMERIC" => "number",
        "BOOLEAN" => "boolean",
        "DATE" | "DATETIME" => "date",
        _ => "string",
    }
}

pub(super) fn mysql_cell(row: &MySqlRow, index: usize, native: &str) -> Value {
    if row
        .try_get_raw(index)
        .map(|value| value.is_null())
        .unwrap_or(true)
    {
        return Value::Null;
    }
    let upper = native.to_ascii_uppercase();
    if upper.contains("BOOL") {
        return row
            .try_get::<bool, _>(index)
            .map(Value::Bool)
            .or_else(|_| {
                row.try_get::<i8, _>(index)
                    .map(|value| Value::Bool(value != 0))
            })
            .or_else(|_| {
                row.try_get::<u8, _>(index)
                    .map(|value| Value::Bool(value != 0))
            })
            .unwrap_or_else(|_| Value::String("[unsupported value]".into()));
    }
    if upper.contains("INT") {
        return row
            .try_get::<i64, _>(index)
            .map(|value| Value::String(value.to_string()))
            .or_else(|_| {
                row.try_get::<u64, _>(index)
                    .map(|value| Value::String(value.to_string()))
            })
            .unwrap_or_else(|_| Value::String("[unsupported value]".into()));
    }
    if upper.contains("FLOAT") || upper.contains("DOUBLE") {
        return row
            .try_get::<f64, _>(index)
            .map(|value| json!(value))
            .unwrap_or(Value::Null);
    }
    if upper.contains("DECIMAL") {
        return row
            .try_get::<BigDecimal, _>(index)
            .map(|value| Value::String(value.to_string()))
            .unwrap_or(Value::Null);
    }
    if upper == "DATE" {
        return row
            .try_get::<NaiveDate, _>(index)
            .map(|value| Value::String(value.to_string()))
            .unwrap_or(Value::Null);
    }
    if upper.contains("DATETIME") || upper.contains("TIMESTAMP") {
        return row
            .try_get::<NaiveDateTime, _>(index)
            .map(|value| Value::String(value.to_string()))
            .unwrap_or(Value::Null);
    }
    if upper == "TIME" {
        return row
            .try_get::<NaiveTime, _>(index)
            .map(|value| Value::String(value.to_string()))
            .unwrap_or(Value::Null);
    }
    if upper == "JSON" {
        return row.try_get::<Value, _>(index).unwrap_or(Value::Null);
    }
    row.try_get::<String, _>(index)
        .map(Value::String)
        .unwrap_or_else(|_| Value::String("[unsupported value]".into()))
}

pub(super) fn sqlite_cell(row: &SqliteRow, index: usize, native: &str) -> Value {
    if row
        .try_get_raw(index)
        .map(|value| value.is_null())
        .unwrap_or(true)
    {
        return Value::Null;
    }
    match native.to_ascii_uppercase().as_str() {
        "INTEGER" => row
            .try_get::<i64, _>(index)
            .map(|value| Value::String(value.to_string()))
            .unwrap_or(Value::Null),
        "REAL" => row
            .try_get::<f64, _>(index)
            .map(|value| json!(value))
            .unwrap_or(Value::Null),
        "BOOLEAN" => row
            .try_get::<bool, _>(index)
            .map(Value::Bool)
            .unwrap_or(Value::Null),
        "BLOB" => row
            .try_get::<Vec<u8>, _>(index)
            .map(|value| Value::String(format!("[binary: {} bytes]", value.len())))
            .unwrap_or(Value::Null),
        _ => row
            .try_get::<String, _>(index)
            .map(Value::String)
            .unwrap_or_else(|_| Value::String("[unsupported value]".into())),
    }
}

pub(super) fn logical_type(native: &str) -> &'static str {
    match native {
        "BOOL" => "boolean",
        "INT2" | "INT4" | "FLOAT4" | "FLOAT8" | "OID" => "number",
        "DATE" | "TIME" | "TIMETZ" | "TIMESTAMP" | "TIMESTAMPTZ" => "date",
        _ => "string",
    }
}

pub(super) fn pg_cell(row: &PgRow, index: usize, native: &str) -> Value {
    if row
        .try_get_raw(index)
        .map(|value| value.is_null())
        .unwrap_or(true)
    {
        return Value::Null;
    }
    match native {
        "BOOL" => row.try_get::<bool, _>(index).map(Value::Bool),
        "INT2" => row.try_get::<i16, _>(index).map(|value| json!(value)),
        "INT4" => row.try_get::<i32, _>(index).map(|value| json!(value)),
        "INT8" => row
            .try_get::<i64, _>(index)
            .map(|value| Value::String(value.to_string())),
        "FLOAT4" => row.try_get::<f32, _>(index).map(|value| json!(value)),
        "FLOAT8" => row.try_get::<f64, _>(index).map(|value| json!(value)),
        "NUMERIC" => row
            .try_get::<BigDecimal, _>(index)
            .map(|value| Value::String(value.to_string())),
        "DATE" => row
            .try_get::<NaiveDate, _>(index)
            .map(|value| Value::String(value.to_string())),
        "TIME" => row
            .try_get::<NaiveTime, _>(index)
            .map(|value| Value::String(value.to_string())),
        "TIMESTAMP" => row
            .try_get::<NaiveDateTime, _>(index)
            .map(|value| Value::String(value.to_string())),
        "TIMESTAMPTZ" => row
            .try_get::<DateTime<Utc>, _>(index)
            .map(|value| Value::String(value.to_rfc3339())),
        "UUID" => row
            .try_get::<Uuid, _>(index)
            .map(|value| Value::String(value.to_string())),
        "JSON" | "JSONB" => row
            .try_get::<Value, _>(index)
            .map(|value| Value::String(value.to_string())),
        "BYTEA" => row
            .try_get::<Vec<u8>, _>(index)
            .map(|value| Value::String(format!("[binary: {} bytes]", value.len()))),
        "OID" => row.try_get::<i32, _>(index).map(|value| json!(value)),
        _ => row.try_get::<String, _>(index).map(Value::String),
    }
    .unwrap_or_else(|_| Value::String("[unsupported value]".to_string()))
}
