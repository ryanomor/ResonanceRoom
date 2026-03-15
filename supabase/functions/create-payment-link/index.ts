import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { roomId, participantId, userId, amount, roomTitle } = await req.json();

    if (!roomId || !participantId || !userId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountInCents = Math.round(amount * 100);

    const priceBody = new URLSearchParams({
      "currency": "usd",
      "unit_amount": String(amountInCents),
      "product_data[name]": roomTitle ?? "Game Entry Fee",
    });

    const priceRes = await fetch("https://api.stripe.com/v1/prices", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: priceBody.toString(),
    });

    const price = await priceRes.json();
    if (!priceRes.ok) {
      return new Response(
        JSON.stringify({ error: price.error?.message ?? "Failed to create price" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const linkBody = new URLSearchParams({
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": "1",
      "mode": "payment",
      "success_url": `echomatch://payment-success?roomId=${roomId}&participantId=${participantId}`,
      "cancel_url": `echomatch://room/${roomId}`,
      "metadata[roomId]": roomId,
      "metadata[participantId]": participantId,
      "metadata[userId]": userId,
    });

    const linkRes = await fetch("https://api.stripe.com/v1/payment_links", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: linkBody.toString(),
    });

    const link = await linkRes.json();
    if (!linkRes.ok) {
      return new Response(
        JSON.stringify({ error: link.error?.message ?? "Failed to create payment link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: link.url, paymentLinkId: link.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
