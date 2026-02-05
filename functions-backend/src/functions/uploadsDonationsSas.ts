import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { corsHeaders, handleOptions } from "../lib/cors";
import {
  BlobSASPermissions,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  SASProtocol,
} from "@azure/storage-blob";

function json(status: number, body: unknown, origin?: string | null): HttpResponseInit {
  return {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    body: JSON.stringify(body),
  };
}

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function sanitize(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

async function handler(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return handleOptions(req);
  const origin = req.headers.get("origin");

  try {
    const { pantryId, filename, contentType } = (await req.json()) as {
      pantryId?: string;
      filename?: string;
      contentType?: string;
    };

    if (!pantryId || !filename || !contentType) {
      return json(400, { error: "pantryId, filename, contentType required." }, origin);
    }

    if (!/^image\/(jpeg|png|webp|gif)$/i.test(contentType)) {
      return json(400, { error: "Only image uploads allowed." }, origin);
    }

    const accountName = getEnv("STORAGE_ACCOUNT_NAME");
    const accountKey = getEnv("STORAGE_ACCOUNT_KEY");
    const container = process.env.STORAGE_CONTAINER_DONATIONS || "donation-photos";

    const blobName = `donations/${sanitize(pantryId)}/${Date.now()}_${sanitize(filename)}`;

    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const expiresOn = new Date(Date.now() + 15 * 60 * 1000);

    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName,
        permissions: BlobSASPermissions.parse("cw"),
        expiresOn,
        protocol: SASProtocol.Https,
      },
      credential
    ).toString();

    const blobUrl = `https://${accountName}.blob.core.windows.net/${container}/${blobName}`;

    return json(
      200,
      {
        uploadUrl: `${blobUrl}?${sas}`,
        blobUrl,
        expiresOn: expiresOn.toISOString(),
      },
      origin
    );
  } catch (err: any) {
    ctx.error(err);
    return json(500, { error: "Failed to generate SAS", detail: err.message }, origin);
  }
}

app.http("uploadsDonationsSas", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "uploads/donations/sas",
  handler,
});
