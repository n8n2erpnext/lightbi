# ADR-031 Perspective Resolution Model

Status:
Accepted

Context:
LightBI fundamentally embraces Question First analytics. However, asking "What are our total sales?" means entirely different things to a CEO versus a Regional Branch Manager. If the application jumps straight from Question to Recipe without resolving perspective, the result will frequently be semantically incorrect for the user's role.

Decision:
The system must always resolve a **Perspective** before any analytical planning begins.
- **Perspective Ownership:** Perspectives belong exclusively to a Project.
- **Perspective Selection:** A Perspective is either explicitly chosen by the user (via the UI) or resolved implicitly based on the user's login role.
- **Perspective Inheritance:** Perspectives can inherit and override settings (e.g., a `Branch Manager` perspective inherits from `Sales` but filters `Dataset Scope` to their branch).

Consequences:
- Rule Established: `Question -> Perspective -> Recipe`. Never `Question -> Recipe`.
- Datasets and Semantic Models are heavily filtered/interpreted based on the active perspective.
