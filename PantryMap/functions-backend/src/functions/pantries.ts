import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { corsHeaders, handleOptions } from "../lib/cors";

function getClient() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;

  if (!endpoint || !key) {
    throw new Error("Missing COSMOS_ENDPOINT or COSMOS_KEY. Check local.settings.json.");
  }

  return new CosmosClient({ endpoint, key });
}

export async function getPantries(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    if (req.method === "OPTIONS") return handleOptions(req);
    const origin = req.headers.get("origin");
    const dbName = process.env.COSMOS_DATABASE ?? "microPantry";
    // Default container name aligned with Cosmos: pantries-items
    const containerName = process.env.COSMOS_CONTAINER_PANTRIES ?? "pantries-items";

    const client = getClient();
    const container = client.database(dbName).container(containerName);

    // Select common UI fields while avoiding Cosmos system metadata.
    // NOTE:
    // - include optional photo/address fields because frontend expects them when present.
    // - include stock / telemetry fields so PantryAPI can compute stockLevel consistently
    //   for both the map list and the pantry detail view.
    const query = `
      SELECT
        c.id, c.name, c.location, c.description, c.detail, c.status, c.updatedAt,
        c.photos, c.img_link, c.imgLink,
        c.url, c.urls, c.photoUrl, c.photoUrls, c.imageUrl, c.imageUrls, c.image, c.imgUrl, c.imgURL,
        c.address, c.adress, c.city, c.town, c.state, c.region, c.zip, c.zipcode, c.postalCode,
        c.refrigerated, c.pantryType, c.type,

        -- Stock / telemetry and donation fields used by PantryAPI.resolveStockLevel(...)
        c.sensors,
        c.weightKg, c.weight, c.current_weight, c.loadcell_kg,
        c.tot_reported_weight, c.totReportedWeight, c.reportedWeightKg,
        c.donation_datetime, c.donationDatetime, c.lastDonationAt,

        -- Activity / timestamp fields used for latestActivity + stockLevelUpdatedAt fallbacks
        c.latestActivity, c.lastActivity, c.lastDonation, c.timestamp, c.time, c._ts,

        -- Inventory / wishlist / stats (lightweight and useful in list view)
        c.inventory, c.categories, c.acceptedFoodTypes, c.hours, c.wishlist, c.stats, c.visitsPerDay
      FROM c
    `;

    const { resources } = await container.items.query(query).fetchAll();

    return {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      body: JSON.stringify(resources ?? []),
    };
  } catch (err: any) {
    const origin = req.headers.get("origin");
    context.log("getPantries error:", err?.message || err);
    return {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      body: JSON.stringify({
        error: "Failed to fetch pantries.",
        detail: err?.message || String(err),
      }),
    };
  }
}

app.http("pantries", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  handler: getPantries,
});

