import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

app.http("wishlist", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    ctx.log("wishlist invoked:", req.method);

    if (req.method === "GET") {
      const pantryId = req.query.get("pantryId") ?? null;
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ id: "milk", pantryId, itemDisplay: "milk", count: 2 }]),
      };
    }

    const body = await req.json().catch(() => ({} as any));
    return {
      status: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, received: body }),
    };
  },
});
