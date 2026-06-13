import re

with open('src/lib/business-signal-detector.ts', 'r', encoding='utf-8') as f:
    content = f.read()

string_boost = """         if (isTime && col.sampleValues) {
            const dateLike = col.sampleValues.some((v: any) => !isNaN(Date.parse(v)));
            if (dateLike) profileBoost += 20;
         }
         
         if (isDimension && col.type && (col.type.toLowerCase() === 'varchar' || col.type.toLowerCase() === 'string')) {
             profileBoost += 10;
         }"""
content = content.replace("""         if (isTime && col.sampleValues) {
            const dateLike = col.sampleValues.some((v: any) => !isNaN(Date.parse(v)));
            if (dateLike) profileBoost += 20;
         }""", string_boost)

content = content.replace('"date", "report date"', '"report", "report date"')

with open('src/lib/business-signal-detector.ts', 'w', encoding='utf-8') as f:
    f.write(content)
