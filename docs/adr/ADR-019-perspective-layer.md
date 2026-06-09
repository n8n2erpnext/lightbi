# ADR-019 Perspective Layer

Status:
Accepted

Context:
Different roles within an organization ask fundamentally different questions of the same data. A CEO looking at a generic "Sales Dataset" wants to see macro-level trends and margins, while an Inventory Manager wants to see product turnover rates. If a BI tool forces a single viewpoint, it alienates other users.

Decision:
The "Perspective" becomes a first-class domain object in LightBI. 
A Perspective defines:
* Business vocabulary specific to a role.
* Recommended metrics.
* Recommended dimensions.
* Recommended questions.
* Recommended charts.

Consequences:
* Better onboarding, as a user selects their role and immediately sees relevant questions.
* Highly domain-specific experiences without needing to copy/duplicate base datasets.
* Reusable analytics patterns mapped securely to organizational roles.
