// Supabase Edge Function: submit-payment-proof
// Public endpoint (no JWT required) — uploads payment proof image to storage
// and creates payment + payment_proofs rows for the given orders.
// Uses SERVICE_ROLE key on the server to bypass RLS safely after validation.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  orderIds: string[];
  outletId: string;
  method: "bank_transfer" | "jazzcash" | "easypaisa";
  transactionId: string;
  proofBase64: string;
  fileName: string;
  contentType: string;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json(500, { ok: false, error: "Server not configured" });
    }

    const payload = (await req.json()) as Payload;
    const { orderIds, outletId, method, transactionId, proofBase64, fileName, contentType } = payload || ({} as Payload);

    if (!Array.isArray(orderIds) || orderIds.length === 0) return json(400, { ok: false, error: "orderIds required" });
    if (!outletId) return json(400, { ok: false, error: "outletId required" });
    if (!["bank_transfer", "jazzcash", "easypaisa"].includes(method)) return json(400, { ok: false, error: "Invalid method" });
    if (!transactionId || transactionId.length > 200) return json(400, { ok: false, error: "Invalid transactionId" });
    if (!proofBase64 || proofBase64.length > 8_000_000) return json(400, { ok: false, error: "Proof too large or missing" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify orders belong to outlet
    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("id, outlet_id, subtotal, tax_amount, service_charge, delivery_charge")
      .in("id", orderIds);
    if (ordersErr) return json(500, { ok: false, error: ordersErr.message });
    if (!orders || orders.length !== orderIds.length) return json(400, { ok: false, error: "Some orders not found" });
    if (orders.some((o) => o.outlet_id !== outletId)) return json(403, { ok: false, error: "Order/outlet mismatch" });

    // Upload proof to storage
    const safeName = (fileName || "proof.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${outletId}/${orderIds[0]}/${Date.now()}-${safeName}`;
    const bytes = base64ToUint8Array(proofBase64);
    const { error: upErr } = await admin.storage
      .from("payment-proofs")
      .upload(storagePath, bytes, { contentType: contentType || "image/jpeg", upsert: false });
    if (upErr) return json(500, { ok: false, error: `Upload failed: ${upErr.message}` });

    const { data: pub } = admin.storage.from("payment-proofs").getPublicUrl(storagePath);
    const imageUrl = pub.publicUrl;

    // Create payment + proof per order
    for (const o of orders) {
      const amount = (o.subtotal || 0) + (o.tax_amount || 0) + (o.service_charge || 0) + (o.delivery_charge || 0);
      const { data: pay, error: payErr } = await admin
        .from("payments")
        .insert({
          order_id: o.id,
          outlet_id: outletId,
          method,
          amount,
          status: "pending_verification",
        })
        .select()
        .single();
      if (payErr) return json(500, { ok: false, error: `Payment row failed: ${payErr.message}` });

      const { error: proofErr } = await admin
        .from("payment_proofs")
        .insert({ payment_id: pay.id, image_url: imageUrl });
      if (proofErr) return json(500, { ok: false, error: `Proof row failed: ${proofErr.message}` });

      await admin
        .from("orders")
        .update({ payment_status: "pending_verification", transaction_id: transactionId })
        .eq("id", o.id);
    }

    return json(200, { ok: true, imageUrl });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message || "Unexpected error" });
  }
});
