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

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

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

async function getDonations(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const origin = req.headers.get("origin");
  const pantryId = req.query.get("pantryId")?.trim() ?? "";
  const page = parsePositiveInt(req.query.get("page"), 1);
  const pageSize = parsePositiveInt(req.query.get("pageSize"), 5);

  if (!pantryId) {
    return json(400, { error: "Missing pantryId." }, origin);
  }

  const container = getDonationsContainer();
  
  // Calculate timestamp for 24 hours ago
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  ctx.log(`🔍 Querying donations for pantryId: ${pantryId}, after: ${twentyFourHoursAgo}`);
  
  // Query donations for this pantry created within the last 24 hours
  const querySpec = {
    query: `SELECT * FROM c 
            WHERE c.pantryId = @pantryId 
            AND c.createdAt >= @twentyFourHoursAgo 
            ORDER BY c.createdAt DESC`,
    parameters: [
      { name: "@pantryId", value: pantryId },
      { name: "@twentyFourHoursAgo", value: twentyFourHoursAgo }
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  const list = resources || [];
  
  ctx.log(`📊 Found ${list.length} donations for pantryId: ${pantryId}`);
  
  const total = list.length;
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize);

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

  const pantryId = (body?.pantryId ?? "").trim();
  if (!pantryId) {
    return json(400, { error: "Missing pantryId." }, origin);
  }

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

  // Only donationSize is required, all other fields are optional
  if (!donationSize) {
    return json(400, { error: "donationSize is required." }, origin);
  }

  const container = getDonationsContainer();

  const item: DonorNote = {
    id: makeId("donation"),
    pantryId,
    ...(note ? { note } : {}),
    ...(donationSize ? { donationSize } : {}),
    ...(donationItems ? { donationItems } : {}),
    ...(photoUrls ? { photoUrls } : {}),
    createdAt: new Date().toISOString(),
  };

  ctx.log("💾 Attempting to create donation in Cosmos DB:", JSON.stringify(item));
  
  try {
    const response = await container.items.create(item);
    ctx.log("✅ Donation created successfully:", response.resource?.id);
  } catch (error: any) {
    ctx.error("❌ Failed to create donation in Cosmos DB:", error?.message || error);
    throw error;
  }

  return json(201, item, origin);
}

app.http("donations", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") {
      return handleOptions(req);
    }
    const origin = req.headers.get("origin");
    try {
      if (req.method === "POST") return await postDonation(req, ctx);
      return await getDonations(req, ctx);
    } catch (e: any) {
      ctx.error("❌ Donations handler error:", e?.message || e);
      ctx.error("Error stack:", e?.stack);
      return json(500, { error: "Donations function error.", detail: e?.message || String(e) }, origin);
    }
  },
});
