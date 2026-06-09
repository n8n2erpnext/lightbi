# ADR-002 Local First Architecture

Status:
Accepted

Context:
LightBI must provide a fast, secure, and robust experience for SMEs without relying on cloud infrastructure or complex deployments. A traditional client-server architecture introduces latency and deployment friction.

Decision:
LightBI is local-first. The desktop application remains fully functional without a server. Future synchronization is optional, and the local machine is always treated as the primary source of truth.

Consequences:
* Offline support natively out-of-the-box.
* Faster UX due to zero network latency for local data operations.
* Simplified SME deployment (no server setup required).
* Sync becomes an enhancement, not a strict requirement for usability.
