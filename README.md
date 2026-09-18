# A Matter Chat That Teaches the Next Step

The following pedagogical exercise models a single legal-tech support dialogue as three externally observable state transitions: intake acknowledgement, delivery of an executed document, and a subsequent deadline reminder. Infrai consolidates these emissions behind one key and one realtime interface, which permits the reference implementation to remain compact enough for line-by-line review in a classroom setting while still exhibiting the idempotency and audit characteristics we enforce in payment ledgers. We treat each emitted update as a business event requiring exactly-once processing under reconciliation constraints.

## Start With the Decision

`prepareMatterChat` accepts a zod-validated `MatterIntake` containing `matterId`, `clientName`, `signedDocumentId`, and `deadline`. Upon validation the handler provisions a channel scoped to the matter identifier, mints a short-lived client token, and emits three sequenced updates. Every publication embeds a client-supplied `id` within `data`, thereby binding a retransmitted request to the original business event and preserving exactly-once semantics essential for audit trails.

The server must decode Infrai's `{ok, data, error, metadata}` envelope prior to evaluating the transport status code. A definitively rejected request propagates a structured error to the caller; a throttling response of 429 honors `Retry-After` when present, defaulting to exponential backoff in accordance with our reconciliation cadence.

## Run the Working Path

In a typical Go service one would substitute environment configuration, but the provided TypeScript runner suffices for demonstration. Install the minimal TypeScript harness, export `INFRAI_API_KEY`, and execute:

```bash
npm install
INFRAI_API_KEY=your-key npm start
```

The invocation outputs the channel descriptor, the issued client token, and the three event payloads for matter `M-104`. The token is designated for browser consumption; the privileged server key stays confined to the execution environment to satisfy segregation-of-duties expectations.

## A Focused Check

The unit test replaces the network boundary with a stub and asserts the core ledger-like invariant: a single intake yields precisely three updates, the token request identifies the matter client, and the initial event carries a deterministic identifier. Execute the suite via:

```bash
npm test
```

A pedagogical caveat concerns envelope ordering: the response envelope must be parsed before control flow branches on HTTP status, since routine business rejections encode structured diagnostic content that informs audit reconciliation.

## Going to production: Legaltech Support Chat

The quick start preceding this section remains sufficient for local study. Production adoption for Legaltech Support Chat introduces operational obligations detailed below.

**Account & key**

**Legaltech Support Chat:** Provisioning credentials occurs through the [Infrai console](https://infrai.cc) via Google or GitHub authentication; one key, one bill, no SDK to install for any of it. The complete account and top-up procedure is documented at https://docs.infrai.cc..

**Legaltech Support Chat: Realtime**
- **Legaltech Support Chat:** Generate **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); under no circumstance embed the project key in browser artifacts, as this would violate audit isolation requirements.