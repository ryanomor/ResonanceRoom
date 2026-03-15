import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const { participantId } = await req.json();

    if (!participantId) {
      return new Response(
        JSON.stringify({ error: "Missing participantId" }),
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

    const { data: payment } = await supabase
      .from("participant_payments")
      .select("stripe_session_id")
      .eq("participant_id", participantId)
      .eq("payment_status", "paid")
      .maybeSingle();

    if (!payment?.stripe_session_id) {
      return new Response(
        JSON.stringify({ refunded: false, reason: "No paid session found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${payment.stripe_session_id}`,
      {
        headers: { "Authorization": `Bearer ${stripeSecretKey}` },
      }
    );
    const stripeSession = await sessionRes.json();
    const paymentIntentId = stripeSession.payment_intent;

    if (!paymentIntentId) {
      return new Response(
        JSON.stringify({ refunded: false, reason: "No payment intent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refundBody = new URLSearchParams({ "payment_intent": paymentIntentId });
    const refundRes = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: refundBody.toString(),
    });

    const refund = await refundRes.json();
    if (!refundRes.ok) {
      return new Response(
        JSON.stringify({ refunded: false, error: refund.error?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("participant_payments")
      .update({ payment_status: "refunded", refunded_at: new Date().toISOString() })
      .eq("participant_id", participantId);

    return new Response(
      JSON.stringify({ refunded: true, refundId: refund.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
