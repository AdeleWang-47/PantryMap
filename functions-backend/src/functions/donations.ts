import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
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

// In-memory store for donor notes (per pantry). Replace with DB in production.
const donorNotesByPantry = new Map<string, Array<{ id: string; pantryId: string; note?: string; photoUrls?: string[]; createdAt: string }>>();

export async function getDonations(
  req: HttpRequest,
  _ctx: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") {
    return handleOptions(req);
  }

  const origin = req.headers.get("origin");
  const pantryId = req.query.get("pantryId")?.trim() ?? "";
  const page = parsePositiveInt(req.query.get("page"), 1);
  const pageSize = parsePositiveInt(req.query.get("pageSize"), 5);

  if (!pantryId) {
    return json(400, { error: "Missing pantryId." }, origin);
  }

  const list = donorNotesByPantry.get(pantryId) ?? [];
  const total = list.length;
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize);

  return json(
    200,
    {
      items,
      page,
      pageSize,
      total,
    },
    origin
  );
}

export async function postDonation(
  req: HttpRequest,
  _ctx: InvocationContext
): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") {
    return handleOptions(req);
  }

  const origin = req.headers.get("origin");
  let body: { pantryId?: string; note?: string; photoUrls?: string[] };
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
  const photoUrls = Array.isArray(body.photoUrls) ? body.photoUrls.filter((u): u is string => typeof u === "string") : undefined;
  const hasNote = note && note.length > 0;
  const hasPhotos = photoUrls && photoUrls.length > 0;
  if (!hasNote && !hasPhotos) {
    return json(400, { error: "At least one of note or photoUrls is required." }, origin);
  }

  const list = donorNotesByPantry.get(pantryId) ?? [];
  const id = `dn-${pantryId}-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const item = {
    id,
    pantryId,
    ...(note ? { note } : {}),
    ...(photoUrls?.length ? { photoUrls } : {}),
    createdAt,
  };
  list.unshift(item);
  donorNotesByPantry.set(pantryId, list);

  return json(201, item, origin);
}

async function donationsHandler(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") {
    return handleOptions(req);
  }
  if (req.method === "POST") {
    return postDonation(req, ctx);
  }
  return getDonations(req, ctx);
}

app.http("donations", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: donationsHandler,
});



