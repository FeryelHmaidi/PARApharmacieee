import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBigBossColisDirect } from "@/lib/delivery/bigboss";

type CompanyRecord = {
  id: string;
  name?: string;
  portal_login?: string | null;
  portal_password?: string | null;
  api_base_url?: string | null;
  tracking_url_template?: string | null;
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { order_id, company_id } = body;

  if (!order_id || !company_id) {
    return NextResponse.json(
      { success: false, message: "order_id et company_id requis" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Fetch order details
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, shipping_phone, shipping_address, shipping_city, guest_info, notes, shipping_fee, order_items(quantity, product:products(name))"
    )
    .eq("id", order_id)
    .single();

  if (orderError || !orderData) {
    return NextResponse.json(
      { success: false, message: "Commande introuvable" },
      { status: 404 }
    );
  }

  const order = orderData as any;

  // Fetch company credentials
  const { data: companyData, error: companyError } = await supabase
    .from("delivery_companies")
    .select("*")
    .eq("id", company_id)
    .single();

  if (companyError || !companyData) {
    return NextResponse.json(
      { success: false, message: "Société de livraison introuvable" },
      { status: 404 }
    );
  }

  const c = companyData as CompanyRecord;

  const isBigBoss =
    c.name?.toLowerCase().includes("bigboss") ||
    c.portal_login?.toLowerCase().includes("bigboss") ||
    c.api_base_url?.toLowerCase().includes("bigboss");

  if (!isBigBoss) {
    return NextResponse.json(
      {
        success: false,
        message: `L'envoi automatique direct par API est actuellement configuré pour BigBoss Express. Pour ${c.name || "cette société"}, vous pouvez saisir directement le numéro de suivi via le bouton "✏️ Saisir N° de suivi" dans le tableau des commandes.`,
      },
      { status: 400 }
    );
  }

  if (!c.portal_login || !c.portal_password) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Identifiants portail non configurés pour BigBoss. Allez dans Admin > Livraison > API & Connexion.",
      },
      { status: 400 }
    );
  }

  const baseUrl = c.api_base_url || "https://my.bigbossexpress.tn";

  const guestInfo = order.guest_info as Record<string, string> | null;
  const items = (order.order_items || []) as Array<{
    quantity: number;
    product?: { name: string } | null;
  }>;
  const designation = items
    .map((i) => `${i.quantity}x ${i.product?.name || "Article"}`)
    .join(", ");

  const result = await createBigBossColisDirect(
    c.portal_login,
    c.portal_password,
    {
      customerName: guestInfo?.full_name || "Client",
      phone: order.shipping_phone || "",
      address: order.shipping_address || "",
      city: order.shipping_city || "",
      totalAmount: Number(order.total_amount || 0),
      notes: order.notes || "",
      itemsSummary: designation,
      orderId: order.id,
    },
    baseUrl
  );

  if (result.success && result.trackingNumber) {
    // Save tracking number to order in DB
    await supabase
      .from("orders")
      .update({
        tracking_number: result.trackingNumber,
        delivery_company: c.name || "Bigboss",
      } as any)
      .eq("id", order_id);
  }

  return NextResponse.json({
    success: result.success,
    message: result.message,
    tracking_number: result.trackingNumber ?? null,
  });
}
