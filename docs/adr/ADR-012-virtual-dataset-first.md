# ADR-012 Virtual Dataset First

Status:
Accepted

Context:
Materializing (saving to disk or database) every intermediate dataset step consumes enormous storage, creates sync/stale-data problems, and slows down iterative analysis. If users are trying multiple recipes and joining multiple sources, forcing materialization cripples performance.

Decision:
Datasets are virtual by default. Materialization is strictly optional.

A dataset should initially exist purely as a definition:
**Datasource(s) → Recipe → Virtual Dataset**

Materialized datasets are only created when:
* Performance explicitly requires it (e.g., massive datasets queried repeatedly).
* The user explicitly requests materialization.
* Caching strategies mandate it for dashboard loading speed.

Consequences:
* Lower storage usage and zero storage bloat from iterative experiments.
* Faster iteration times when building reports.
* Vastly better support for ad-hoc, multi-source reporting.
