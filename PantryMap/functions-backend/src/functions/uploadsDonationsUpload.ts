import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { corsHeaders, handleOptions } from "../lib/cors";

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
    // Expect multipart/form-data with fields:
    // - pantryId: string
    // - file: File (image)
    const form = await req.formData();
    const pantryId = String(form.get("pantryId") ?? "").trim();
    const file = form.get("file");

    if (!pantryId) return json(400, { error: "Missing pantryId." }, origin);
    if (!file || !(file instanceof File)) return json(400, { error: "Missing file." }, origin);

    const contentType = file.type || "";
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(contentType)) {
      return json(400, { error: "Only image uploads allowed." }, origin);
    }

    const accountName = getEnv("STORAGE_ACCOUNT_NAME");
    const accountKey = getEnv("STORAGE_ACCOUNT_KEY");
    const containerName = process.env.STORAGE_CONTAINER_DONATIONS || "donation-photos";

    const blobName = `donations/${sanitize(pantryId)}/${Date.now()}_${sanitize(file.name || "upload")}`;
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const service = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
    const container = service.getContainerClient(containerName);
    const blockBlob = container.getBlockBlobClient(blobName);

    const bytes = Buffer.from(await file.arrayBuffer());
    await blockBlob.uploadData(bytes, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;
    return json(200, { blobUrl }, origin);
  } catch (err: any) {
    ctx.error(err);
    return json(500, { error: "Upload failed", detail: err?.message || String(err) }, origin);
  }
}

app.http("uploadsDonationsUpload", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "uploads/donations/upload",
  handler,
});

