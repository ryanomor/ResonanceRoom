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
    let userId: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      userId = url.searchParams.get("userId");
    } else {
      const body = await req.json();
      userId = body.userId ?? null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
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

    const { data: record } = await supabase
      .from("host_stripe_accounts")
      .select("stripe_account_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!record?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "No Stripe account found for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountRes = await fetch(
      `https://api.stripe.com/v1/accounts/${record.stripe_account_id}`,
      { headers: { "Authorization": `Bearer ${stripeSecretKey}` } }
    );

    const account = await accountRes.json();
    if (!accountRes.ok) {
      return new Response(
        JSON.stringify({ error: account.error?.message ?? "Failed to retrieve Stripe account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isActive =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    const connectStatus = isActive ? "active" : "pending";

    await supabase
      .from("host_stripe_accounts")
      .update({
        connect_status: connectStatus,
        onboarding_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (req.method === "GET") {
      const html = `<!DOCTYPE html><html><head><title>Stripe Connect</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#111;color:#fff;"><div style="text-align:center;"><h1>${isActive ? "Connected!" : "Almost there..."}</h1><p>${isActive ? "Your Stripe account is now active. You can close this window and return to the app." : "Your account setup is not yet complete. Please return to the app and try again."}</p></div></body></html>`;
      return new Response(html, { headers: { ...corsHeaders, "Content-Type": "text/html" } });
    }

    return new Response(
      JSON.stringify({
        connectStatus,
        stripeAccountId: record.stripe_account_id,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
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
