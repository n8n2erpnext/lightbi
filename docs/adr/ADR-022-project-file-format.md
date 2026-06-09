# ADR-022 Project File Format

Status:
Accepted

Context:
Users need to be able to share, backup, and sync their LightBI work easily. If metadata is stored deep in a hidden global system directory, users cannot easily export or version-control their projects.

Decision:
A LightBI Project is represented by a self-contained directory.

Project Folder Structure:
```text
MyProject/
├── project_manifest.json (Global identifier and version tracking)
├── metadata.db           (SQLite authoritative store)
├── cache/                (DuckDB cached files / temporary parquet data)
├── exports/              (User-generated CSVs or PDFs)
└── logs/                 (Project-specific execution logs)
```

The `project_manifest.json` stores:
- `projectId`
- `name`
- `schemaVersion`
- `createdAt`
- `lightbiVersion`

Consequences:
* Portable projects: A user can zip a folder and send it to a colleague.
* Backup friendly: Standard backup tools can copy the folder safely.
* Offline friendly: All state exists locally in a single directory.
