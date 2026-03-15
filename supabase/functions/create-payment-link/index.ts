import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLATFORM_FEE_RATE = 0.025;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { roomId, participantId, userId, amount, roomTitle, hostUserId } = await req.json();

    if (!roomId || !participantId || !userId || !amount || !hostUserId) {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: hostAccount } = await supabase
      .from("host_stripe_accounts")
      .select("stripe_account_id, connect_status")
      .eq("user_id", hostUserId)
      .maybeSingle();

    if (!hostAccount?.stripe_account_id || hostAccount.connect_status !== "active") {
      return new Response(
        JSON.stringify({ error: "Host has not connected a Stripe account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountInCents = Math.round(amount * 100);
    const applicationFeeCents = Math.round(amountInCents * PLATFORM_FEE_RATE);

    const sessionBody = new URLSearchParams({
      "mode": "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(amountInCents),
      "line_items[0][price_data][product_data][name]": roomTitle ?? "Game Entry Fee",
      "line_items[0][quantity]": "1",
      "payment_intent_data[application_fee_amount]": String(applicationFeeCents),
      "payment_intent_data[transfer_data][destination]": hostAccount.stripe_account_id,
      "payment_intent_data[metadata][roomId]": roomId,
      "payment_intent_data[metadata][participantId]": participantId,
      "payment_intent_data[metadata][userId]": userId,
      "payment_intent_data[metadata][hostUserId]": hostUserId,
      "success_url": `echomatch://payment-success?roomId=${roomId}&participantId=${participantId}`,
      "cancel_url": `echomatch://room/${roomId}`,
      "metadata[roomId]": roomId,
      "metadata[participantId]": participantId,
      "metadata[userId]": userId,
      "metadata[hostUserId]": hostUserId,
      "metadata[amountCents]": String(amountInCents),
      "metadata[applicationFeeCents]": String(applicationFeeCents),
    });

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: sessionBody.toString(),
    });

    const session = await sessionRes.json();
    if (!sessionRes.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message ?? "Failed to create checkout session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
