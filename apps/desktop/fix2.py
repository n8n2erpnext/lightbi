with open('src/lib/duckdb-preview-sandbox.test.ts', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('normal?.row_count_count', 'normal?.record_count_count')
content = content.replace('aged?.row_count_count', 'aged?.record_count_count')
content = content.replace('aged.row_count_count', 'aged.record_count_count')
with open('src/lib/duckdb-preview-sandbox.test.ts', 'w', encoding='utf-8') as f:
    f.write(content)
