# ADR-011 Question First Analytics

Status:
Accepted

Context:
Traditional Business Intelligence tools expect users to understand data modeling. Users are forced into a workflow that demands technical knowledge upfront: "Connect Datasource → Model Data → Build Dashboard." This creates a steep learning curve and limits adoption to data analysts and engineers. 

Decision:
LightBI starts from user intent. The primary interaction model must be "Question First Analytics."

The workflow becomes:
**Question → Suggested Data → Recipe → Dataset → Chart → Dashboard**

Consequences:
* Lower learning curve: users begin by stating what they want to know.
* Faster onboarding.
* Broader audience: caters to SMEs, managers, and operational staff.
* Reduced BI knowledge requirements: the system maps intent to technical execution.
