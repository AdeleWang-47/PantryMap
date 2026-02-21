import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { corsHeaders, handleOptions } from "../lib/cors";

function json(status: number, body: unknown, origin?: string | null): HttpResponseInit {
  return {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    body: JSON.stringify(body),
  };
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

/** Normalize pantryId so "p-1", "1", "pantry-1" all map to the same key (avoids empty list after refresh when UI uses different id format). */
function normalizePantryId(pantryId: string): string {
  const t = (pantryId ?? "").trim();
  if (!t) return t;
  const numeric = t.replace(/^(?:pantry|p)[-_]?/i, "").trim();
  if (/^\d+$/.test(numeric)) return numeric;
  return t;
}

/** Donation document shape. pantryId must be string for Cosmos partition key /pantryId. */
type DonorNote = {
  id: string;
  pantryId: string;
  note?: string;
  donationSize?: string;
  donationItems?: string[];
  photoUrls?: string[];
  createdAt: string;
};

function getDonationsContainer() {
  const endpoint = requireEnv("COSMOS_ENDPOINT");
  const key = requireEnv("COSMOS_KEY");
  const dbId = process.env.COSMOS_DATABASE || "microPantry";
  const containerId = process.env.COSMOS_CONTAINER_DONATIONS || "donations";
  const client = new CosmosClient({ endpoint, key });
  return client.database(dbId).container(containerId);
}

async function getDonations(req: HttpRequest): Promise<HttpResponseInit> {
  const origin = req.headers.get("origin");
  const pantryId = req.query.get("pantryId")?.trim() ?? "";
  const page = parsePositiveInt(req.query.get("page"), 1);
  const pageSize = parsePositiveInt(req.query.get("pageSize"), 5);

  if (!pantryId) {
    return json(400, { error: "Missing pantryId." }, origin);
  }

  const key = normalizePantryId(pantryId);
  const container = getDonationsContainer();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const offset = (page - 1) * pageSize;

  const [countResult, itemsResult] = await Promise.all([
    container.items
      .query({
        query: "SELECT VALUE COUNT(1) FROM c WHERE c.pantryId = @pantryId AND c.createdAt >= @since",
        parameters: [
          { name: "@pantryId", value: key },
          { name: "@since", value: twentyFourHoursAgo },
        ],
      })
      .fetchAll(),
    container.items
      .query({
        query:
          "SELECT * FROM c WHERE c.pantryId = @pantryId AND c.createdAt >= @since ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit",
        parameters: [
          { name: "@pantryId", value: key },
          { name: "@since", value: twentyFourHoursAgo },
          { name: "@offset", value: offset },
          { name: "@limit", value: pageSize },
        ],
      })
      .fetchAll(),
  ]);

  const total = countResult.resources[0] ?? 0;
  const items = itemsResult.resources ?? [];

  return json(200, { items, page, pageSize, total }, origin);
}

async function postDonation(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const origin = req.headers.get("origin");

  let body: { pantryId?: string; note?: string; donationSize?: string; donationItems?: string[]; photoUrls?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json(400, { error: "Invalid JSON body." }, origin);
  }

  const rawPantryId = (body?.pantryId ?? "").trim();
  if (!rawPantryId) {
    return json(400, { error: "Missing pantryId." }, origin);
  }
  const pantryId = normalizePantryId(rawPantryId);

  const note = typeof body.note === "string" ? body.note.trim() : undefined;
  const donationSize = typeof body.donationSize === "string" ? body.donationSize.trim() : undefined;
  const donationItems =
    Array.isArray(body.donationItems) && body.donationItems.length > 0
      ? body.donationItems.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : undefined;
  const photoUrls =
    Array.isArray(body.photoUrls) && body.photoUrls.length > 0
      ? body.photoUrls.filter((u): u is string => typeof u === "string")
      : undefined;

  if (!donationSize) {
    return json(400, { error: "donationSize is required." }, origin);
  }

  const item: DonorNote = {
    id: `dn-${pantryId}-${Date.now()}`,
    pantryId,
    ...(note ? { note } : {}),
    ...(donationSize ? { donationSize } : {}),
    ...(donationItems ? { donationItems } : {}),
    ...(photoUrls ? { photoUrls } : {}),
    createdAt: new Date().toISOString(),
  };

  const container = getDonationsContainer();
  await container.items.create(item);

  return json(201, item, origin);
}

async function handler(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return handleOptions(req);
  try {
    if (req.method === "POST") return await postDonation(req, ctx);
    return await getDonations(req);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.error("donations handler error:", msg);
    return json(500, { error: "Donations function error.", detail: msg }, origin);
  }
}

app.http("donations", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler,
});
