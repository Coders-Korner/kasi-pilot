<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Threat modelling and design review

Threat modelling will help the KasiPilot team identify what could go wrong before implementation. The process should examine the system architecture, data flows, users, external services, trust boundaries, and possible attack paths.

OWASP recommends four main activities: decompose the application, identify and rank threats, define mitigations, and review and validate the results.[^1][^2]

## 1. Scope of the model

The threat model will cover:

- Trader WhatsApp messages and voice notes.
- WhatsApp Business API webhooks.
- The KasiPilot backend.
- Speech-to-text processing.
- AI transaction extraction.
- The validation layer.
- The PostgreSQL database.
- The trader dashboard.
- Partner dashboards.
- Notifications and reports.
- Cloud hosting and third-party services.
- Administrators and support staff.


### Out of scope for the first prototype

- Banking and loan approval systems.
- Supplier payments.
- Full marketplace functionality.
- Government identity verification.
- Automated credit scoring.
- Large-scale integrations with distributor systems.

Keeping the scope narrow makes the design review practical and prevents the team from overlooking the highest-risk areas.

## 2. System actors

| Actor | Legitimate role | Security concern |
| :-- | :-- | :-- |
| Trader | Sends transactions and views own records | Account takeover or false submissions |
| KasiPilot backend | Processes messages and updates records | Exploitation of APIs or business logic |
| AI service | Extracts structured transaction data | Incorrect output or prompt manipulation |
| Speech-to-text service | Converts voice to text | Voice-data exposure or transcription errors |
| Distributor | Views authorised insights | Excessive access to trader data |
| ESD programme | Monitors supported businesses | Unauthorised personal-data access |
| Administrator | Manages users and systems | Privilege abuse or compromised account |
| Attacker | No legitimate role | Fraud, data theft, disruption |
| WhatsApp/Meta | Delivers messages and webhooks | Third-party dependency or service failure |
| Cloud provider | Hosts system components | Configuration or availability risk |

## 3. Data-flow diagram

Use this simplified diagram in the design documentation or presentation:

```text
[Trader]
   │
   │ Text or voice note
   ▼
[WhatsApp Business Platform]
   │
   │ Authenticated webhook
   ▼
[KasiPilot Webhook API]
   │
   │ Validated message
   ▼
[Message Queue]
   │
   ├──► [Speech-to-Text Service]
   │
   ▼
[AI Transaction Parser]
   │
   │ Structured JSON
   ▼
[Validation and Business Rules]
   │
   ▼
[PostgreSQL Database]
   │
   ├──► [Trader WhatsApp Confirmation]
   ├──► [Trader Dashboard]
   └──► [Authorised Partner Reports]
```


## 4. Trust boundaries

Trust boundaries show where data moves between systems with different levels of trust.

### Boundary 1: Trader to WhatsApp

The trader controls the content of the message. The system must not assume that every message is correctly formatted or safe.

**Controls:**

- Validate message content.
- Limit message length and audio size.
- Confirm uncertain transactions.
- Do not treat message text as system instructions.


### Boundary 2: WhatsApp to KasiPilot

WhatsApp sends webhook requests to the backend.

**Controls:**

- Verify webhook signatures.
- Use HTTPS.
- Validate the payload structure.
- Reject requests from unknown sources.
- Use idempotency keys to prevent duplicate processing.


### Boundary 3: KasiPilot to AI services

The backend sends text or transcribed voice content to an external AI provider.

**Controls:**

- Minimise the information sent.
- Do not include unnecessary personal details.
- Use secure API authentication.
- Apply provider data-retention controls where available.
- Validate all AI output on the backend.
- Never allow the AI to directly execute database commands.


### Boundary 4: Backend to database

The application reads and writes sensitive business information.

**Controls:**

- Use a private database network where possible.
- Apply least-privilege database permissions.
- Use parameterised queries.
- Encrypt connections.
- Log important record changes.
- Back up the database securely.


### Boundary 5: Database to dashboards

Dashboards display business information to traders and partners.

**Controls:**

- Enforce user and organisation permissions.
- Ensure a trader can access only their own data.
- Provide partners with only approved data.
- Avoid exposing database IDs or sensitive fields unnecessarily.
- Log report access and data exports.


## 5. STRIDE threat analysis

Use STRIDE to categorise threats:

- **Spoofing:** Pretending to be another trader.
- **Tampering:** Changing sales or stock records.
- **Repudiation:** Denying that a transaction was submitted.
- **Information disclosure:** Exposing business or personal information.
- **Denial of service:** Flooding the system or preventing access.
- **Elevation of privilege:** Gaining administrator or partner permissions.

OWASP identifies these categories as useful for analysing application threats and attack paths.[^3]

## 6. Key threats and mitigations

| Threat | Attack scenario | Impact | Mitigation |
| :-- | :-- | :-- | :-- |
| Spoofed trader | Attacker uses or impersonates a trader’s number | False transactions and data exposure | Number verification, authentication, confirmation |
| Fake webhook | Attacker sends a forged request to the API | Fraud or unauthorised processing | Signature verification and HTTPS |
| AI prompt injection | User attempts to manipulate system instructions | Unauthorised actions or incorrect records | Treat input as data, constrain actions, backend validation |
| Incorrect extraction | “I sold four kotas” is interpreted incorrectly | Wrong sales and stock information | Schema validation, confidence checks, user confirmation |
| Database breach | Attacker exploits an API or weak credentials | Exposure of all trader records | Encryption, secure queries, least privilege, monitoring |
| Broken authorisation | Trader accesses another trader’s dashboard | Privacy breach | Object-level access checks and automated tests |
| Partner overreach | Distributor sees identifiable information unnecessarily | Unauthorised disclosure | Data minimisation, consent, role-based access |
| Duplicate webhook | Same message processed twice | Incorrect revenue and stock | Idempotency keys and unique transaction IDs |
| Message flooding | Attacker sends thousands of messages | Increased costs or service outage | Rate limiting, queues, quotas, monitoring |
| Voice-note leakage | Temporary recordings remain accessible | Privacy breach | Encryption, short retention, automatic deletion |
| Admin compromise | Stolen administrator credentials | System-wide damage | MFA, least privilege, audit logs |
| Service outage | WhatsApp, AI, or cloud service fails | Delayed or missing records | Queues, retries, error messages, backups |

## 7. Design decisions from the threat model

The threat model should directly change the architecture.

### Queue-first processing

The webhook should acknowledge receipt quickly and place the message into a persistent queue. AI processing should happen asynchronously.

This reduces the risk of timeouts, lost messages, and inconsistent processing.

### Validation before database insertion

The AI should never write directly to PostgreSQL.

The flow must be:

```text
AI output
   ↓
Schema validation
   ↓
Business-rule validation
   ↓
User confirmation if needed
   ↓
Database insertion
```


### Confirmation for uncertainty

If the system cannot confidently identify the product, price, or quantity, it should ask the trader before saving the transaction.

### Separate partner views

Partners should not receive direct database access. They should use restricted reports or APIs that expose only the data necessary for their purpose.

### Immutable audit trail

When a transaction is created, corrected, or deleted, the system should record:

- Who initiated the action.
- When it happened.
- The original value.
- The changed value.
- The reason for the change.
- Whether the change was made by the trader, administrator, or automated system.


## 8. Design-review checklist

The team should review the following questions before implementation:

### Identity and access

- Can a trader access only their own records?
- How is a WhatsApp number linked to a user account?
- What happens if a phone is lost or a number changes?
- Do administrators use multi-factor authentication?
- Are inactive accounts disabled or reviewed?


### Data protection

- What personal information is collected?
- Is voice audio retained after transcription?
- Is partner sharing based on consent?
- Is sensitive information encrypted?
- How long will records be kept?


### AI safety

- Can a user manipulate the AI into performing unauthorised actions?
- Are AI outputs validated before use?
- What happens when the AI is uncertain?
- Can the trader correct a transaction?
- Is the original message available for audit?


### API security

- Are webhook signatures verified?
- Are API keys stored outside the source code?
- Are requests rate-limited?
- Are duplicate messages detected?
- Are error messages free from sensitive information?


### Availability

- What happens when WhatsApp is unavailable?
- What happens when the AI provider fails?
- Are failed jobs retried?
- Are duplicate retries safe?
- Are backups tested?


### Partner access

- Does each partner see only authorised data?
- Is identifiable data necessary?
- Are exports logged?
- Can access be revoked?
- Are data-sharing agreements in place?


## 9. Review outputs

The design review should produce:

1. A data-flow diagram.
2. A list of assets.
3. A list of trust boundaries.
4. A threat register.
5. A mitigation plan.
6. Security requirements linked to each threat.
7. Security test cases.
8. Open risks and accepted exceptions.
9. Owners for unresolved issues.
10. A date or event that triggers the next review.

NIST recommends that security requirements and risks be considered during design, and that an independent or suitably qualified person review whether the design addresses the identified requirements and risks.[^4]

## 10. Security test examples

| Requirement | Test |
| :-- | :-- |
| Traders see only their own records | Log in as Trader A and attempt to access Trader B’s record |
| Webhooks are authentic | Send a request with an invalid signature and confirm rejection |
| Duplicate messages are prevented | Process the same webhook twice and confirm one transaction |
| AI output is validated | Send invalid quantity and price values and confirm rejection |
| Partner access is restricted | Attempt to access data outside the partner’s assigned group |
| Voice files are deleted | Confirm temporary audio is removed after processing |
| Rate limiting works | Send repeated requests and confirm the system limits them |
| Admin MFA is active | Attempt administrator login without the second factor |
| Audit records exist | Correct a transaction and verify the original and new values are logged |
| Failed jobs are recoverable | Simulate an AI outage and confirm the message is retried safely |

## Short version for your submission

> KasiPilot will use threat modelling to examine its data flows, assets, trust boundaries, users, and external services. The main threats include spoofed WhatsApp messages, unauthorised access, incorrect AI extraction, prompt injection, database compromise, excessive partner access, duplicate transactions, voice-note exposure, and service disruption. The design will address these risks through webhook verification, HTTPS, authentication, role-based access control, encryption, asynchronous queues, strict AI-output validation, user confirmation, audit logs, rate limiting, data minimisation, and secure deletion. A design review will then verify that each identified risk is linked to a security requirement, mitigation, and test.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html

[^2]: https://owasp.org/www-project-threat-modeling/

[^3]: https://owasp.org/www-community/Threat_Modeling_Process

[^4]: https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.04232020.pdf

[^5]: https://owasp.org/www-project-security-culture/v10/6-Threat_Modelling/

[^6]: https://owasp.org/www-project-threat-dragon/

[^7]: https://owasp.org/www-project-developer-guide/release/design/threat_modeling/practical_threat_modeling/

[^8]: https://owasp.org/www-chapter-frankfurt/assets/slides/55_OWASP_Frankfurt_Stammtisch_2.pdf

[^9]: https://owaspsamm.org/model/design/threat-assessment/stream-b/

[^10]: https://thales.cs.unipi.gr/modules/document/file.php/CDS103/2024_OWASP_Threat_Modelling.pdf

[^11]: https://wiki.owasp.org/images/a/a6/AdvancedThreatModeling.pdf

[^12]: https://www.sorena.io/artifacts/global/nist-sp-800-218-ssdf/faq/threat-modeling

[^13]: https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-218.pdf

[^14]: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218-draft.pdf

[^15]: https://owasp.org/www-community/Threat_Modeling

