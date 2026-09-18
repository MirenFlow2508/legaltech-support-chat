import assert from "node:assert/strict";
import { prepareMatterChat } from "./legal_support_chat.js";

const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
globalThis.fetch = async (input, init) => {
  calls.push({ path: new URL(String(input)).pathname, body: JSON.parse(String(init?.body ?? "{}")) });
  const path = new URL(String(input)).pathname;
  const data = path.endsWith("token/issue") ? { token: "client-token" } : { accepted: true };
  return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
};
(process.env as Record<string, string | undefined>).INFRAI_API_KEY = "test-key";

const result = await prepareMatterChat({ matterId: "M-1", clientName: "Lee", signedDocumentId: "D-1", deadline: "2026-10-01" }, "acct-1");
assert.equal(result.events.length, 3);
assert.equal(calls[0].path, "/v1/realtime/channel/create");
assert.equal(calls[1].body.client_id, "client-M-1");
assert.equal(calls[2].body.data && (calls[2].body.data as Record<string, unknown>).id, "M-1-0");
console.log("legal support chat decision test passed");
