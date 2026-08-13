# Security policy

## Supported versions

Security fixes are provided for the latest public Beta release.

## Reporting a vulnerability

Please do not open a public issue containing exploit details, credentials, private datasets, or database connection strings.

Use GitHub's **Report a vulnerability** private disclosure flow for this repository. Include:

- the affected LightBI version;
- the source type and workflow involved;
- reproduction steps using synthetic data;
- expected and observed behavior;
- impact and any known mitigation.

We will acknowledge a complete report, validate it against the supported Beta, and coordinate disclosure after a fix is available.

## Scope priorities

High-priority areas include credential storage, Advanced write boundaries, local-file/source continuity, online-source fetching, export data leakage, unsafe SQL construction, and native update/distribution integrity.
