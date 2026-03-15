import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const signature = v1Part.slice(3);
  const signedPayload = `${timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    const payload = await req.text();
    const sigHeader = req.headers.get("stripe-signature") ?? "";

    if (webhookSecret && sigHeader) {
      const valid = await verifyStripeSignature(payload, sigHeader, webhookSecret);
      if (!valid) {
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const event = JSON.parse(payload);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const {
        participantId,
        roomId,
        amountCents,
        applicationFeeCents,
      } = session.metadata ?? {};

      if (participantId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const paymentIntentId = session.payment_intent;
        let transferId: string | null = null;

        if (paymentIntentId) {
          const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeSecretKey) {
            const piRes = await fetch(
              `https://api.stripe.com/v1/payment_intents/${paymentIntentId}`,
              { headers: { "Authorization": `Bearer ${stripeSecretKey}` } }
            );
            const pi = await piRes.json();
            transferId = pi.transfer ?? null;
          }
        }

        await supabase
          .from("participant_payments")
          .upsert({
            participant_id: participantId,
            room_id: roomId,
            stripe_session_id: session.id,
            stripe_transfer_id: transferId,
            amount_cents: amountCents ? parseInt(amountCents) : null,
            application_fee_cents: applicationFeeCents ? parseInt(applicationFeeCents) : null,
            payment_status: "paid",
            paid_at: new Date().toISOString(),
          });
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
