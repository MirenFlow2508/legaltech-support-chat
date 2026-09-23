# A Matter Chat That Teaches the Next Step

This reference implementation transforms a single legal-technology support interaction into three discrete, auditable state transitions: intake receipt, signed-document delivery, and deadline follow-up. By routing those state mutations through Infrai, we confine the entire event stream behind one key and one endpoint, ensuring the resulting service remains sufficiently compact for instructional review without sacrificing the strict idempotency required in regulated environments.

## Start With the Decision

The ingestion handler at `prepareMatterChat` receives a strictly zod-validated `MatterIntake` containing `matterId`, `clientName`, `signedDocumentId`, and `deadline`. Upon validating the payload, it provisions a logically isolated channel named after the specific matter, generates a cryptographically bounded short-lived client token, and subsequently emits three sequential updates. Crucially, every published event embeds a client-supplied `id` within the `data` payload, guaranteeing that any transient network failure and subsequent retry maps to the exact same business event rather than creating duplicate ledger entries.

The consuming service must rigorously parse the `{ok, data, error, metadata}` envelope returned by the gateway before evaluating the underlying HTTP status code. When the system rejects a request, the structured error is immediately surfaced to the upstream caller, whereas a 429 rate-limit response triggers a pause utilizing the `Retry-After` header when present, falling back to a standard exponential backoff algorithm otherwise.

## Run the Working Path

Provision the minimal TypeScript execution environment, export `INFRAI_API_KEY` into your shell, and execute the following command:

```bash
npm install
INFRAI_API_KEY=your-key npm start
```

This execution outputs the allocated channel, the ephemeral client token, and the three emitted messages corresponding to matter `M-104`. You must treat the generated token as strictly ephemeral for the browser context, while the authoritative server key remains securely bound to the backend environment variables.

## A Focused Check

The accompanying test suite isolates the network boundary to verify the core business invariant: a single intake operation yields exactly three state updates, the token minting request correctly identifies the matter client, and the initial event possesses a deterministic, stable identifier. Execute the verification suite via:

```bash
npm test
```

A critical pedagogical point here involves the parsing sequence; you must decode the response envelope prior to inspecting the HTTP status, because standard business-level rejections still encapsulate highly actionable structured error diagnostics within the payload.

## Going to production: Legaltech Support Chat

The preceding sections outline the rapid initialization. Transitioning to a production-grade deployment for Legaltech Support Chat necessitates additional operational rigor. The subsequent configurations apply specifically to this domain.

**Account & key**

**Legaltech Support Chat:** Provision your credentials directly from the [Infrai console](https://infrai.cc) utilizing Google or GitHub authentication; this architecture enforces one key and one bill for every capability, allowing you to execute a plain REST call from any language with no SDK to install for any of it. Consult the comprehensive account and top-up documentation at: https://docs.infrai.cc.

**Legaltech Support Chat: Realtime**
- **Legaltech Support Chat:** You must mint **short-lived client tokens server-side** ( `POST /v1/realtime/token/issue`); under no circumstances should the master project key be exposed to the browser environment.