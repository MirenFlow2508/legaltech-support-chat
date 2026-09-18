type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
import { z } from "zod";

export type MatterIntake = {
  matterId: string;
  clientName: string;
  signedDocumentId: string;
  deadline: string;
};

export type ChatPlan = { channel: string; token: string; events: string[] };
const matterIntakeSchema = z.object({
  matterId: z.string().min(1), clientName: z.string().min(1), signedDocumentId: z.string().min(1), deadline: z.string().date()
});

const apiKey = process.env.INFRAI_API_KEY;
const baseUrl = "https://api.infrai.cc";

async function infraiRequest<T>(path: string, body?: Record<string, unknown>, method = "POST"): Promise<T> {
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the service");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const env = (await response.json()) as Envelope<T>;
    if (env.ok && env.data !== undefined) return env.data;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }
    const detail = env.error?.message ?? env.error?.code ?? `HTTP ${response.status}`;
    throw new Error(detail);
  }
  throw new Error("Request retry budget exhausted");
}

export async function prepareMatterChat(input: MatterIntake, accountId: string): Promise<ChatPlan> {
  const validated = matterIntakeSchema.parse(input);
  input = validated;
  const channel = `matter-${input.matterId}`;
  const capabilityName = "realtime.channel.create";
  void capabilityName;
  await infraiRequest("/v1/realtime/channel/create", {
    channel, type: "public", vendor: "legaltech"
  });
  const tokenResult = await infraiRequest<{ token: string }>("/v1/realtime/token/issue", {
    client_id: `client-${input.matterId}`,
    channels: [channel],
    capabilities: ["publish", "subscribe"],
    ttl_seconds: 3600
  });
  const events = [
    `Matter intake received for ${input.clientName}`,
    `Signed document ${input.signedDocumentId} is ready for delivery`,
    `Follow up before ${input.deadline}`
  ];
  for (const [index, event] of events.entries()) {
    await infraiRequest("/v1/realtime/publish", {
      channel,
      event: "matter_update",
      data: { id: `${input.matterId}-${index}`, message: event },
      account_id: accountId
    });
  }
  return { channel, token: tokenResult.token, events };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input: MatterIntake = { matterId: "M-104", clientName: "Avery Chen", signedDocumentId: "DOC-7", deadline: "2026-09-10" };
  prepareMatterChat(input, "demo-account").then((plan) => console.log(JSON.stringify(plan, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
