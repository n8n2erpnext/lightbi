use rust_xlsxwriter::{Workbook, XlsxError};
use lightbi_runtime_backend::model::ResultSet;

pub struct ExcelGenerator;

impl ExcelGenerator {
    pub fn generate_from_resultset(result_set: &ResultSet, output_path: &str) -> Result<(), XlsxError> {
        let mut workbook = Workbook::new();
        let worksheet = workbook.add_worksheet();

        // Write headers
        for (col_idx, field) in result_set.columns.iter().enumerate() {
            worksheet.write_string(0, col_idx as u16, &field.name)?;
        }

        // Write data
        for (row_idx, row) in result_set.rows.iter().enumerate() {
            for (col_idx, val) in row.iter().enumerate() {
                let text = match val {
                    serde_json::Value::Null => "".to_string(),
                    serde_json::Value::String(s) => s.clone(),
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    _ => val.to_string(),
                };
                worksheet.write_string((row_idx + 1) as u32, col_idx as u16, &text)?;
            }
        }

        workbook.save(output_path)?;
        Ok(())
    }
}
