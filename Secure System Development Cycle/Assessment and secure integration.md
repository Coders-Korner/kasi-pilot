<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Assessment and secure integration

The final stage will confirm that KasiPilot’s security controls work together in the complete system and that external services are integrated safely before release.

This stage is different from testing individual components. It assesses the **whole product**:

```text
WhatsApp
   ↓
Webhook
   ↓
KasiPilot API
   ↓
Queue
   ↓
Speech-to-text / AI service
   ↓
Validation layer
   ↓
Database
   ↓
Dashboard, alerts, and partner reports
```

The assessment must verify that security is maintained across every connection, data flow, user role, and third-party service.

## 1. Integration security scope

Assess the following integrations:

- WhatsApp Business Platform.
- Speech-to-text provider.
- AI or language-model API.
- PostgreSQL database.
- Message queue.
- Cloud-hosting platform.
- Email, SMS, or notification service, if used.
- Trader dashboard.
- Distributor dashboard.
- ESD or partner reporting tools.
- Logging and monitoring services.

OWASP identifies unsafe consumption of APIs as a major risk. External API responses must be validated and sanitised rather than trusted automatically.[^1]

## 2. Third-party service assessment

Before integrating a provider, document:

- What information will be sent to the provider?
- Why is the information necessary?
- Where is the data processed?
- How long is it retained?
- Is it used to train models?
- How is it encrypted?
- What happens if the service becomes unavailable?
- How are provider credentials protected?
- How can credentials be revoked?
- What security responsibilities belong to KasiPilot and the provider?
- Does the provider support relevant privacy and security requirements?


### Data-minimisation example

The AI service may need:

```text
“I sold 4 kotas at R35 each.”
```

It probably does not need:

```text
Trader full name
Phone number
Exact home address
Identity number
Bank-account information
```

Only the minimum required information should be sent to external providers.

## 3. Secure integration requirements

### WhatsApp integration

- Use official WhatsApp Business Platform endpoints.
- Use HTTPS.
- Verify webhook signatures.
- Validate incoming payloads.
- Store the WhatsApp message ID.
- Prevent duplicate processing.
- Do not expose access tokens in frontend code.
- Apply rate limits.
- Handle provider retries safely.
- Log delivery and processing status without storing unnecessary message content.


### AI integration

- Send only necessary data.
- Use strict structured output.
- Validate the response against a schema.
- Apply application-level business rules.
- Set timeouts.
- Limit response size.
- Handle refusals and malformed outputs.
- Do not allow AI responses to execute database commands.
- Do not allow AI to make access-control decisions.
- Monitor unusual increases in AI usage.


### Speech-to-text integration

- Restrict audio size and duration.
- Use encrypted transmission.
- Validate the transcription response.
- Delete temporary audio according to the retention policy.
- Handle unclear or empty transcriptions.
- Do not send audio to an unapproved provider.
- Record processing status without retaining unnecessary voice content.


### Database integration

- Use encrypted connections.
- Use separate credentials for development and production.
- Apply least-privilege permissions.
- Use parameterised queries.
- Restrict public access.
- Back up data securely.
- Test backup restoration.
- Monitor failed and unusual database activity.


### Dashboard integration

- Require authentication.
- Enforce authorisation server-side.
- Prevent cross-trader data access.
- Use secure cookies or tokens.
- Apply session expiry.
- Restrict report exports.
- Prevent sensitive information from appearing in browser logs.
- Use security headers and safe output encoding.


## 4. End-to-end security assessment

Test the complete workflow from message submission to final response.

### Scenario A: Valid transaction

```text
Trader sends voice note
        ↓
Audio is received securely
        ↓
Transcription is generated
        ↓
AI extracts transaction fields
        ↓
Output passes schema validation
        ↓
Database record is created
        ↓
Trader receives confirmation
        ↓
Dashboard displays the transaction
```

Verify:

- Correct user identity.
- Correct transaction ownership.
- Correct AI extraction.
- Correct database update.
- Correct confirmation.
- No sensitive information exposed in logs.


### Scenario B: Ambiguous transaction

```text
Trader sends unclear message
        ↓
AI identifies missing or uncertain fields
        ↓
System asks for confirmation
        ↓
No record is saved until confirmation
```

Verify that the system does not create inaccurate transactions automatically.

### Scenario C: Duplicate message

```text
Same WhatsApp message received twice
        ↓
System recognises the existing message ID
        ↓
Only one transaction is saved
```


### Scenario D: AI service unavailable

```text
Message received
        ↓
AI service fails
        ↓
Message remains safely queued
        ↓
System retries later
        ↓
Trader receives a delayed-processing message
```

Verify that no message is lost and that the trader is not falsely told that the transaction was recorded.

### Scenario E: Unauthorised dashboard request

```text
Trader A requests Trader B’s transaction
        ↓
Backend checks ownership
        ↓
Request is rejected
        ↓
Security event is logged
```


## 5. Integration security controls

| Integration risk | Required control |
| :-- | :-- |
| Forged webhook | Signature verification |
| Provider token theft | Secret manager and token rotation |
| Malicious external response | Response schema validation |
| Sensitive data over-sharing | Data minimisation |
| Provider outage | Queue, retry, timeout, and fallback |
| Duplicate messages | Idempotency keys |
| Excessive API costs | Rate limits and usage alerts |
| Unauthorised partner access | Scoped permissions and separate roles |
| Redirect to malicious endpoint | Allowlist approved destinations |
| Excessive response data | Filter responses before returning them |
| Provider compromise | Vendor risk assessment and limited permissions |
| Data leakage through logs | Redaction and access-controlled logging |

OWASP specifically recommends validating data received from integrated APIs, using secure communication, restricting redirects to approved destinations, and avoiding the transfer of more sensitive information than necessary.[^1]

## 6. Environment assessment

The team should maintain separate environments:

### Development

- Test data only.
- Test API keys.
- No real trader information.
- Debugging allowed but controlled.


### Staging

- Production-like architecture.
- Synthetic or anonymised data.
- Test WhatsApp number.
- Security and integration tests.
- No unrestricted public access.


### Production

- Real trader data.
- Production credentials.
- Debug mode disabled.
- Monitoring enabled.
- Backups enabled.
- Strict access control.
- Approved deployment process.

Never connect development tools or test applications directly to the production database.

## 7. Deployment assessment

Before deployment, verify:

- All critical and high-severity security findings are fixed.
- Secrets are not stored in the repository.
- Production configuration is secure.
- HTTPS is enabled.
- Database access is restricted.
- Debug mode is disabled.
- Dependencies have been scanned.
- Webhook verification is active.
- Backups have been completed.
- Recovery procedures have been tested.
- Logging and alerting are working.
- Access permissions have been reviewed.
- Privacy notice and consent flow are available.
- Third-party providers are approved.


## 8. Security sign-off checklist

| Question | Status |
| :-- | :-- |
| Have all major threats been addressed? | Pass / Fail |
| Are all external APIs authenticated securely? | Pass / Fail |
| Are third-party responses validated? | Pass / Fail |
| Can traders access only their own records? | Pass / Fail |
| Are partner permissions restricted? | Pass / Fail |
| Are AI outputs validated before storage? | Pass / Fail |
| Are duplicate messages prevented? | Pass / Fail |
| Are sensitive data and secrets protected? | Pass / Fail |
| Are temporary voice notes deleted appropriately? | Pass / Fail |
| Are logs free from unnecessary personal data? | Pass / Fail |
| Are backups and restoration tested? | Pass / Fail |
| Have high-severity vulnerabilities been fixed? | Pass / Fail |
| Is the privacy and consent process ready? | Pass / Fail |
| Is there an incident-response process? | Pass / Fail |
| Has an authorised person approved release? | Pass / Fail |

## 9. Security assessment evidence

Keep evidence showing that the assessment was completed:

- Threat model.
- Architecture and data-flow diagram.
- Security requirements.
- Test plan.
- Test results.
- Vulnerability register.
- Code-review records.
- Dependency-scan results.
- Webhook-verification tests.
- Access-control tests.
- Backup-restoration results.
- Third-party provider assessment.
- Data-processing and sharing documentation.
- Release approval.
- Accepted-risk register.


## 10. Incident-response preparation

Even a prototype should define what happens if something goes wrong.

The team should know how to:

1. Identify and confirm the incident.
2. Stop or isolate the affected service.
3. Revoke compromised API keys.
4. Disable affected user or partner accounts.
5. Preserve relevant logs.
6. Assess what data was affected.
7. Notify responsible stakeholders.
8. Restore the service safely.
9. Fix the vulnerability.
10. Document lessons learned.

The incident plan should include contacts for:

- Technical lead.
- Product owner.
- Cloud provider.
- WhatsApp or messaging provider.
- AI provider.
- Data-protection or privacy responsible person.
- Affected partner, where applicable.


## 11. Continuous assessment after release

Security assessment should not end when the prototype is deployed.

Monitor:

- Failed login attempts.
- Invalid webhook signatures.
- Unusual message volumes.
- Repeated AI failures.
- Unusual database queries.
- Data exports.
- Permission changes.
- API-cost spikes.
- Failed background jobs.
- Provider outages.
- New dependency vulnerabilities.
- Security complaints from traders.

Review the threat model whenever:

- A new integration is added.
- A new user role is introduced.
- Data-sharing rules change.
- The AI workflow changes.
- The platform begins storing new types of information.
- A security incident occurs.
- The application moves from prototype to production.

An API security testing framework can also be integrated into GitHub Actions so that API checks run on pull requests and changes are assessed continuously.[^2]

## 12. Go-live decision

KasiPilot should proceed to a controlled pilot only when:

- No critical vulnerabilities remain.
- High-risk access-control issues are resolved.
- Webhook authentication has passed.
- AI output is validated.
- Database access is restricted.
- Partner permissions are tested.
- Sensitive data is protected.
- Backups can be restored.
- External integrations have been assessed.
- Monitoring and incident-response procedures are available.
- Users have been informed about data use.
- Remaining risks have been documented and formally accepted.


## Short version for submission

> During the Assessment and Secure Integration phase, KasiPilot will verify that all components and third-party services work together securely. The assessment will cover WhatsApp webhooks, AI and speech-to-text APIs, the backend, queue, database, dashboards, partner access, cloud hosting, and logging. External API responses will be validated, sensitive data will be minimised, credentials will be protected and rotated, and permissions will be restricted. End-to-end tests will cover valid, duplicate, ambiguous, unauthorised, and failed transactions. The system will only be released after critical risks are resolved, high-risk findings are addressed, backups and recovery are tested, integration evidence is documented, and an authorised reviewer approves the release. This approach follows OWASP guidance for API testing and safe third-party API consumption.[^2][^1]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^3][^4][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://owasp.org/API-Security/editions/2023/en/0xaa-unsafe-consumption-of-apis/

[^2]: https://owasp.org/www-project-api-security-testing-framework/

[^3]: https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-supply-chain-security-guidance-11

[^4]: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

[^5]: https://owasp.org/API-Security/

[^6]: https://owasp.org/www-community/api_security_tools

[^7]: https://github.com/OWASP/www-project-api-security-testing-framework

[^8]: https://deepwiki.com/OWASP/wstg/3.10-api-testing

[^9]: https://accuknox.com/blog/owasp-api-security-top-10-the-complete-testing-checklist-2026

[^10]: https://www.apyguard.com/resources/blog/unsafe-consumption-of-apis-owasp-api10

[^11]: https://www.apisec.ai/blog/unsafe-consumption-of-apis-owasp-10-securing-third-party-integrations

[^12]: https://securitywall.co/blog/security-assessment-api-integration-requirements

[^13]: https://vendorcheck.io/guides/vendor-api-security-assessment

[^14]: https://www.cisa.gov/resources-tools/resources/nist-sp-800-218-secure-software-development-framework-v11-recommendations-mitigating-risk-software

[^15]: https://owasp.org/www-project-api-security/

