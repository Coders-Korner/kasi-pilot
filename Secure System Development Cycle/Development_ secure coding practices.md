<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Development: secure coding practices

During development, KasiPilot should be built using secure coding practices so that security is included in the code from the beginning rather than added after the prototype is complete.

The development process should follow the principle:

> **Validate every input, authorise every action, protect every secret, and record important security events.**

OWASP’s current Top 10 highlights risks particularly relevant to KasiPilot, including broken access control, security misconfiguration, software supply-chain failures, cryptographic failures, injection, authentication failures, data-integrity failures, weak logging, and unsafe error handling.[^1]

## 1. Secure coding standards

The team should create a short coding-security checklist and apply it to every feature.

Minimum rules:

- Validate all inputs on the server.
- Use allowlists where possible.
- Encode outputs correctly.
- Use parameterised database queries.
- Enforce authorisation at the backend.
- Never trust client-side checks.
- Never hardcode secrets.
- Use secure error handling.
- Keep dependencies updated.
- Review code before merging.
- Log important security events without exposing sensitive information.
- Write security tests for high-risk functionality.

NIST recommends validating inputs and outputs and reviewing human-readable code or using automated code analysis before release.[^2]

## 2. Input validation

KasiPilot receives untrusted input from several sources:

- WhatsApp messages.
- Voice transcriptions.
- Dashboard forms.
- Webhook requests.
- AI-generated JSON.
- Partner API requests.
- File uploads and audio attachments.

Every input must be validated before processing.

### Transaction validation

For every transaction, validate:

- Transaction type must be one of the approved values, such as `sale`, `purchase`, or `stock_adjustment`.
- Product name must be present or mapped to a known product.
- Quantity must be a positive number.
- Unit price must be a valid non-negative amount.
- Currency must be supported.
- Date must be valid and within an acceptable range.
- Text and audio must have maximum size limits.
- Unknown fields should be rejected or ignored safely.

Example schema:

```json
{
  "transaction_type": "sale",
  "product": "kota",
  "quantity": 4,
  "unit_price": 35,
  "currency": "ZAR"
}
```

Do not allow the AI to send raw database commands, arbitrary fields, or unrestricted actions.

## 3. Secure AI integration

The AI is treated as an untrusted processing component, not as an authority.

### Secure AI rules

- Use a strict JSON schema.
- Keep system instructions separate from trader messages.
- Treat user messages as data.
- Validate every field returned by the AI.
- Reject unexpected fields.
- Apply business rules after AI extraction.
- Ask the trader to confirm ambiguous information.
- Do not let the AI directly access the database.
- Do not let the AI decide user permissions.
- Do not allow the AI to delete data without a separate authorised workflow.
- Store the original input and final transaction reference for audit purposes.


### Safe transaction flow

```text
Incoming message
      ↓
Input-size and format validation
      ↓
AI extraction
      ↓
JSON-schema validation
      ↓
Business-rule validation
      ↓
User confirmation if uncertain
      ↓
Authorised database write
```

For example, if the AI extracts a quantity of `-4`, the backend must reject it even if the output is valid JSON.

## 4. Authentication and authorisation

Authentication confirms who the user is. Authorisation determines what that user is allowed to do.

### Trader access

- A trader must see only their own business records.
- Every database query must include the authenticated trader or organisation ID.
- Users must not be able to change their ID through request parameters.
- Account recovery must verify ownership of the phone number.
- Inactive sessions should expire.
- Sensitive account changes should require additional verification.


### Partner access

Distributors and ESD programmes should receive restricted access.

- A distributor should see only assigned retailers or authorised aggregate data.
- An ESD programme should see only participating businesses.
- Partners should not have direct database access.
- Export permissions should be limited and logged.
- Access should be reviewed and revoked when a partnership ends.


### Administrator access

- Administrators should use multi-factor authentication.
- Administrative roles should be separated.
- Support users should not automatically receive database-export permissions.
- High-risk actions should require confirmation.
- All administrative actions should be audited.


## 5. Database security

The database contains sensitive trader and business records.

Secure coding practices should include:

- Use an ORM or parameterised queries.
- Never construct SQL using string concatenation.
- Use separate database accounts for different services.
- Give the application only the permissions it needs.
- Prevent direct public access to the database.
- Encrypt connections between services.
- Encrypt backups.
- Use database constraints to protect data integrity.
- Use unique transaction IDs.
- Use foreign keys and validation rules.
- Keep an audit record for corrections and deletions.


### Example unsafe practice

```javascript
const query = `SELECT * FROM transactions WHERE trader_id = '${traderId}'`;
```


### Safer approach

```javascript
const result = await db.query(
  "SELECT * FROM transactions WHERE trader_id = $1",
  [authenticatedTraderId]
);
```

The application should use the authenticated identity rather than trusting a trader ID supplied by the browser.

## 6. Secrets management

Never place the following in source code:

- WhatsApp access tokens.
- AI API keys.
- Database passwords.
- Encryption keys.
- JWT signing secrets.
- Cloud credentials.
- Webhook verification secrets.

Use:

- Environment variables for the prototype.
- A secure secrets manager for production.
- Separate secrets for development, testing, and production.
- Secret rotation when a key is exposed.
- `.gitignore` to prevent local secret files from being committed.

If a secret is accidentally committed to GitHub, it must be revoked and replaced. Simply deleting it from the latest commit is not sufficient because it may remain in Git history.

## 7. API and webhook security

The WhatsApp webhook is a public entry point and must be treated as exposed infrastructure.

Implement:

- HTTPS only.
- Webhook verification.
- Signature validation.
- Request-body validation.
- Rate limiting.
- Maximum payload size.
- Request timeouts.
- Idempotency keys.
- Safe retry handling.
- No sensitive information in error responses.
- Monitoring for unusual request patterns.


### Idempotency

If WhatsApp retries the same message, KasiPilot must not record the sale twice.

Each incoming message should have a unique external message ID. Before processing:

```text
Has this message ID already been processed?
       ├── Yes → Return the existing result
       └── No  → Process and store the message ID
```


## 8. File and voice-note security

Voice notes are untrusted file uploads.

The application should:

- Accept only approved audio types.
- Limit file size and duration.
- Scan or validate the file format.
- Store files outside the public web directory.
- Generate random storage names.
- Avoid using original filenames.
- Restrict access to authorised services.
- Delete temporary files after transcription.
- Avoid retaining voice recordings unnecessarily.
- Log access to stored audio.

The system should not allow uploaded files to be executed as code.

## 9. Secure error handling

Errors should help legitimate users without helping attackers.

### Do not expose:

- Database connection details.
- API keys.
- Internal file paths.
- Stack traces.
- SQL queries.
- Personal information.
- AI provider credentials.
- User-existence information.


### User-facing message

> “We could not process that transaction. Please try again.”

### Internal log

```text
transaction_parse_failed
user_id: internal-user-id
message_id: internal-message-id
reason: schema_validation_error
timestamp: timestamp
```

Logs should contain enough detail for troubleshooting but should not store full sensitive voice notes or unnecessary personal information.

## 10. Dependency and supply-chain security

KasiPilot will rely on frameworks, packages, AI providers, messaging providers, and cloud services.

Secure practices include:

- Use official packages and SDKs.
- Pin or control dependency versions.
- Review new packages before adding them.
- Scan dependencies for known vulnerabilities.
- Remove unused dependencies.
- Keep lockfiles committed.
- Update dependencies regularly.
- Review third-party permissions.
- Avoid copying untrusted code directly into the project.
- Protect the CI/CD pipeline.

This is important because software supply-chain failures are listed among OWASP’s major current application-security risks.[^1]

## 11. Code review

Every security-sensitive change should be reviewed by another team member before merging.

Review:

- Authentication.
- Authorisation.
- Database queries.
- Webhook handling.
- AI prompts and output processing.
- File uploads.
- Data exports.
- Logging.
- Error handling.
- Secrets and configuration.
- Payment or partner integrations.

The reviewer should ask:

- Can an unauthorised user call this endpoint?
- Is every input validated on the server?
- Can one trader access another trader’s data?
- Can this input cause injection?
- Is sensitive information written to logs?
- What happens when the external service fails?
- Can a request be replayed?
- Are duplicate transactions possible?


## 12. Testing during development

Security testing should be part of normal development.

### Unit tests

Test:

- Quantity and price validation.
- Transaction-type validation.
- Product mapping.
- Permission checks.
- Duplicate-message handling.
- Data-retention logic.
- AI-output rejection.


### Integration tests

Test:

- WhatsApp webhook verification.
- Queue processing.
- AI service failure.
- Database failure.
- Voice-note handling.
- Dashboard access.
- Partner-report permissions.


### Security tests

Test:

- SQL injection.
- Cross-site scripting.
- Broken object-level authorisation.
- Invalid JWT or session tokens.
- Request flooding.
- Oversized audio uploads.
- Malformed JSON.
- Prompt injection attempts.
- Replay of previously processed webhooks.
- Access to another trader’s records.


### Automated tools

For the development pipeline, use:

- Linter.
- Type checker.
- Secret scanner.
- Dependency vulnerability scanner.
- Static application security testing.
- Unit and integration test runner.
- Container or infrastructure scanner, if containers are used.


## 13. Secure Git and CI/CD practices

The team should:

- Protect the main branch.
- Require pull requests.
- Require at least one review before merging.
- Run tests automatically.
- Prevent secrets from being committed.
- Restrict deployment permissions.
- Use separate development and production environments.
- Log deployments.
- Roll back unsafe releases.
- Keep production credentials out of pull requests and logs.


## 14. Secure-coding checklist for KasiPilot

| Area | Practice |
| :-- | :-- |
| Input | Validate all messages, forms, files, and AI output |
| Database | Use parameterised queries and least-privilege accounts |
| Access | Enforce trader, partner, and admin permissions server-side |
| APIs | Verify signatures, use HTTPS, rate-limit, and prevent replay |
| AI | Use schema validation and confirmation for uncertain transactions |
| Files | Limit audio size, restrict storage, and delete temporary files |
| Secrets | Store keys in environment variables or a secrets manager |
| Errors | Return safe messages and keep sensitive details out of responses |
| Logs | Record security events without storing unnecessary personal data |
| Dependencies | Scan, update, and remove unused packages |
| Code review | Review all security-sensitive changes |
| Testing | Add automated security and permission tests |
| Deployment | Separate environments and protect the main branch |

## Hackathon implementation priority

If time is limited, implement these first:

1. Server-side input validation.
2. Strict AI-output schema validation.
3. Trader-level access control.
4. Secure webhook verification.
5. Parameterised database queries.
6. Environment-based secret management.
7. Duplicate-message protection.
8. Safe error responses.
9. Basic audit logging.
10. Dependency and secret scanning.
11. Peer review before deployment.
12. A privacy notice and consent flow.

## Short version for submission

> KasiPilot will apply secure coding practices throughout development. All inputs—including WhatsApp messages, voice transcriptions, dashboard requests, webhooks, and AI outputs—will be validated on the server. The system will use strict JSON schemas, parameterised database queries, role-based access control, HTTPS, verified webhooks, idempotency keys, secure secret management, encrypted storage, safe error handling, and audit logging. Voice files will be size-limited and deleted after processing where possible. Dependencies will be scanned and updated, while security-sensitive code will undergo peer review and automated testing. These practices align with OWASP secure-coding guidance and NIST recommendations for input validation, code review, vulnerability analysis, and secure software development.[^3][^4][^2]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://owasp.org/Top10/2025/

[^2]: https://csrc.nist.gov/files/pubs/sp/800/218/final/docs/nist.sp.800-218.ssdf-table.xlsx

[^3]: https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html

[^4]: https://cheatsheetseries.owasp.org/cheatsheets/Secure_Product_Design_Cheat_Sheet.html

[^5]: https://owasp.org/www-project-top-ten/

[^6]: https://owasp.org/Top10/2025/0x00_2025-Introduction/

[^7]: https://owasp.org/Top10/2025/es/

[^8]: https://owasp.org/Top10/2025/X01_2025-Next_Steps/

[^9]: https://cheatsheetseries.owasp.org/IndexASVS.html

[^10]: https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/stable-en/

[^11]: https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/stable-en/02-checklist/

[^12]: https://github.com/owasp/top10

[^13]: https://wiki.owasp.org/index.php/Secure_Coding_Cheat_Sheet

[^14]: https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-218.pdf

[^15]: https://csrc.nist.gov/pubs/sp/800/218/final

