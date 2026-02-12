import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

app.http("telemetryLatest", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "telemetry/latest",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log("ECE_TELEMETRY_BASE_URL =", process.env.ECE_TELEMETRY_BASE_URL);
    const pantryId = (req.query.get("pantryId") || "").trim();

    if (!pantryId) {
      return {
        status: 400,
        jsonBody: { error: "Missing pantryId" }
      };
    }

    const baseUrl = process.env.ECE_TELEMETRY_BASE_URL;
    if (!baseUrl) {
      return {
        status: 500,
        jsonBody: { error: "Missing ECE_TELEMETRY_BASE_URL" }
      };
    }

    const url =
      `${baseUrl.replace(/\/$/, "")}/GetLatestPantry?pantryId=${encodeURIComponent(pantryId)}`;

    try {
      const r = await fetch(url);
      const text = await r.text();

      if (!r.ok) {
        return {
          status: 502,
          headers: { "Cache-Control": "no-store" },
          jsonBody: {
            error: "Upstream telemetry API failed",
            upstreamStatus: r.status,
            upstreamBody: text
          }
        };
      }

      return {
        status: 200,
        headers: { "Cache-Control": "no-store" },
        jsonBody: JSON.parse(text)
      };

    } catch (e: any) {
      return {
        status: 502,
        headers: { "Cache-Control": "no-store" },
        jsonBody: {
          error: "Telemetry fetch exception",
          message: String(e?.message || e)
        }
      };
    }
  }
});
