# LightBI Documentation Library

Start with [`project-book/README.md`](./project-book/README.md). The Project Book is the onboarding and provenance layer; the rest of this directory is source material.

Current top-level groups:

- `project-book/` — current project book, worklog, source catalog, cleanup manifests;
- `product/` — product direction/commercial drafts;
- `architecture/` — canonical architecture, phase closures, and machine-consumed audit evidence;
- `adr/` — earlier ADR series;
- `domain-catalog/` — domain knowledge sources;
- `plugin-sdk/` — provider/plugin documentation;
- `design/` — design baselines;
- `release/` — dated release checklists/evidence;
- `progress/` and `changelog/` — historical phase chronology;
- `history/` — legacy root documents reorganized by provenance/type.

Do not move `docs/architecture/*.json` merely for appearance: many are machine-consumed by governance tests. Path changes require code/CI consumer audit first.
