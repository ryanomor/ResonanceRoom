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
    const { roomId, hostUserId } = await req.json();

    if (!roomId || !hostUserId) {
      return new Response(
        JSON.stringify({ error: "Missing roomId or hostUserId" }),
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
        JSON.stringify({ paid: false, reason: "Host Stripe account not active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingPayout } = await supabase
      .from("host_payouts")
      .select("id, payout_status")
      .eq("room_id", roomId)
      .maybeSingle();

    if (existingPayout?.payout_status === "paid") {
      return new Response(
        JSON.stringify({ paid: true, reason: "Payout already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: payments } = await supabase
      .from("participant_payments")
      .select("participant_id, amount_cents, stripe_session_id")
      .eq("room_id", roomId)
      .eq("payment_status", "paid");

    if (!payments || payments.length === 0) {
      return new Response(
        JSON.stringify({ paid: false, reason: "No paid participants found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const grossCents = payments.reduce((sum: number, p: { amount_cents: number | null }) => sum + (p.amount_cents ?? 0), 0);
    const platformFeeCents = Math.round(grossCents * PLATFORM_FEE_RATE);
    const netPayoutCents = grossCents - platformFeeCents;

    if (netPayoutCents <= 0) {
      return new Response(
        JSON.stringify({ paid: false, reason: "Net payout is zero" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transferBody = new URLSearchParams({
      "amount": String(netPayoutCents),
      "currency": "usd",
      "destination": hostAccount.stripe_account_id,
      "metadata[roomId]": roomId,
      "metadata[hostUserId]": hostUserId,
      "metadata[participantCount]": String(payments.length),
    });

    const transferRes = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: transferBody.toString(),
    });

    const transfer = await transferRes.json();
    if (!transferRes.ok) {
      await supabase.from("host_payouts").upsert({
        room_id: roomId,
        host_user_id: hostUserId,
        stripe_account_id: hostAccount.stripe_account_id,
        gross_collected_cents: grossCents,
        platform_fee_cents: platformFeeCents,
        net_payout_cents: netPayoutCents,
        participant_count: payments.length,
        payout_status: "failed",
        stripe_transfer_ids: [],
        created_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ paid: false, error: transfer.error?.message ?? "Transfer failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("host_payouts").upsert({
      room_id: roomId,
      host_user_id: hostUserId,
      stripe_account_id: hostAccount.stripe_account_id,
      gross_collected_cents: grossCents,
      platform_fee_cents: platformFeeCents,
      net_payout_cents: netPayoutCents,
      participant_count: payments.length,
      payout_status: "paid",
      stripe_transfer_ids: [transfer.id],
      paid_out_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        paid: true,
        transferId: transfer.id,
        grossCents,
        platformFeeCents,
        netPayoutCents,
        participantCount: payments.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
