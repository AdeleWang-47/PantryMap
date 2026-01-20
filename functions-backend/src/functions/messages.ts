import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

app.http("messages", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    ctx.log("messages invoked:", req.method);

    if (req.method === "GET") {
      const pantryId = req.query.get("pantryId") ?? null;
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            id: "msg_1",
            pantryId,
            content: "Hello",
            userName: "Anonymous",
            userAvatar: null,
            photos: [],
            createdAt: new Date().toISOString(),
          },
        ]),
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
