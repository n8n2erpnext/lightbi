# LightBI language packages

LightBI discovers every `languages/*.json` file during the application build. Adding a
language does not require a component change or a new conditional branch.

## Add a language

1. Copy `languages/en.json` to a BCP 47-style name such as `languages/zh-CN.json`.
2. Fill in `meta` and `messages` using the format below.
3. Build LightBI. The language is automatically listed in **Settings**.

```json
{
  "$schema": "../language.schema.json",
  "meta": {
    "code": "zh-CN",
    "label": "Chinese (Simplified)",
    "nativeLabel": "简体中文",
    "locale": "zh-CN",
    "direction": "ltr"
  },
  "messages": {
    "Dashboard": "仪表板",
    "Document": "单据"
  }
}
```

Message keys are stable English source strings. Missing messages fall back to the
English source, so an incomplete community translation never breaks the interface.
Locale metadata controls number, date and currency formatting. Use `direction: "rtl"`
for right-to-left languages.

Business terminology follows ERPNext-style wording: use operational nouns such as
Document, Warehouse, Branch, Customer, Supplier, Reporting period and Reconciliation
consistently instead of translating the same concept differently on each screen.

New language files are auto-discovered at build time. A released desktop binary must be
rebuilt to package a newly added file; no application code needs to change.

## Vietnamese semantic QA

Vietnamese follows the same source-aware policy used by the `erpnext2vi` localization project:

- prefer the real business meaning over word-for-word translation;
- translate by the English source and product context, never by global replacement of a Vietnamese word;
- keep familiar technical vocabulary such as API, SQL, Dashboard, Theme, JSON, OAuth, Webhook, Pivot, SLA and KPI when that is clearer to Vietnamese users;
- use data/BI vocabulary consistently: `row` = **dòng**, `dimension` = **chiều phân tích**, `metric/measure` = **chỉ số**, `grain` = **mức chi tiết**, `evidence` = **bằng chứng**;
- domain-specific terms override generic dictionary meanings, e.g. `Margin` = **Biên lợi nhuận**, `Lead` = **Khách hàng tiềm năng**, `Patient` = **Bệnh nhân**, `Quotation` = **Báo giá**, `Shift` = **Ca làm**.

`language-semantic-quality.test.ts` guards the reviewed glossary, placeholder parity and known machine-translation failure modes. New UI copy must be present in both English/Vietnamese catalogs; the debt baseline is intentionally empty.
