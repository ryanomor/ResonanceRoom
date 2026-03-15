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
    const { userId } = await req.json();

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

    const { data: existing } = await supabase
      .from("host_stripe_accounts")
      .select("stripe_account_id, connect_status")
      .eq("user_id", userId)
      .maybeSingle();

    let stripeAccountId = existing?.stripe_account_id;

    if (!stripeAccountId) {
      const accountBody = new URLSearchParams({
        "type": "express",
        "capabilities[transfers][requested]": "true",
        "metadata[userId]": userId,
      });

      const accountRes = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: accountBody.toString(),
      });

      const account = await accountRes.json();
      if (!accountRes.ok) {
        return new Response(
          JSON.stringify({ error: account.error?.message ?? "Failed to create Stripe account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      stripeAccountId = account.id;

      await supabase.from("host_stripe_accounts").upsert({
        user_id: userId,
        stripe_account_id: stripeAccountId,
        connect_status: "pending",
        updated_at: new Date().toISOString(),
      });
    }

    const linkBody = new URLSearchParams({
      "account": stripeAccountId,
      "refresh_url": `echomatch://stripe-connect/refresh?userId=${userId}`,
      "return_url": `echomatch://stripe-connect/complete?userId=${userId}`,
      "type": "account_onboarding",
    });

    const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
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
        JSON.stringify({ error: link.error?.message ?? "Failed to create onboarding link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("host_stripe_accounts")
      .update({ onboarding_url: link.url, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ url: link.url, stripeAccountId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
