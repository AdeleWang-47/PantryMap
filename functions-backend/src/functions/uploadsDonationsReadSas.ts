import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { corsHeaders, handleOptions } from "../lib/cors";
import { BlobSASPermissions, SASProtocol, StorageSharedKeyCredential, generateBlobSASQueryParameters } from "@azure/storage-blob";

function json(status: number, body: unknown, origin?: string | null): HttpResponseInit {
  return {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    body: JSON.stringify(body),
  };
}

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * GET /uploads/donations/read-sas?blobUrl=<full blob url>
 * Returns read-only SAS url for viewing in <img>.
 */
export async function uploadsDonationsReadSas(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  const origin = req.headers.get("origin");

  const blobUrl = (req.query.get("blobUrl") ?? "").trim();
  if (!blobUrl) return json(400, { error: "Missing blobUrl." }, origin);

  // Parse container + blobName from URL
  let url: URL;
  try {
    url = new URL(blobUrl);
  } catch {
    return json(400, { error: "Invalid blobUrl." }, origin);
  }

  // pathname: /<container>/<blobName...>
  const parts = url.pathname.split("/").filter(Boolean);
  const containerName = parts.shift();
  const blobName = parts.join("/");

  if (!containerName || !blobName) {
    return json(400, { error: "blobUrl must include container and blob path." }, origin);
  }

  const accountName = getRequiredEnv("STORAGE_ACCOUNT_NAME");
  const accountKey = getRequiredEnv("STORAGE_ACCOUNT_KEY");

  const credential = new StorageSharedKeyCredential(accountName, accountKey);

  const expiresOn = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"), // read only
      expiresOn,
      protocol: SASProtocol.Https,
    },
    credential
  ).toString();

  const readUrl = `${url.origin}${url.pathname}?${sas}`;

  return json(200, { readUrl, expiresOn: expiresOn.toISOString() }, origin);
}

app.http("uploadsDonationsReadSas", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "uploads/donations/read-sas",
  handler: uploadsDonationsReadSas,
});
