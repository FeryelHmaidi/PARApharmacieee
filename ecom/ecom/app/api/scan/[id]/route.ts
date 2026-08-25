import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const supabase = createRouteHandlerClient({ cookies });
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json({ success: false, message: "ID commande requis" }, { status: 400 });
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          quantity,
          price_at_purchase,
          variant_id,
          product:products(name),
          variant:product_variants(stock, size_value, size_unit)
        )
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ success: false, message: "Commande introuvable" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const supabase = createRouteHandlerClient({ cookies });
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json({ success: false, message: "ID commande requis" }, { status: 400 });
    }

    // 1. Fetch current order with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          quantity,
          variant_id,
          product_id
        )
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ success: false, message: "Commande introuvable" }, { status: 404 });
    }

    const currentStatus = order.status;

    // Verify if already packed / locked
    if (currentStatus === "shipped" || currentStatus === "delivered") {
      return NextResponse.json({
        success: true,
        alreadyPacked: true,
        newStatus: currentStatus,
        message: "Cette commande est dÃ©jÃ  emballÃ©e / expÃ©diÃ©e et verrouillÃ©e.",
      });
    }

    // 2. Perform Stock Deduction for each item with variant
    const items = order.order_items || [];
    const stockErrors = [];

    for (const item of items) {
      if (item.variant_id) {
        // Fetch current variant stock
        const { data: variant } = await supabase
          .from("product_variants")
          .select("id, stock")
          .eq("id", item.variant_id)
          .maybeSingle();

        if (variant) {
          const newStock = Math.max(0, (variant.stock ?? 0) - item.quantity);
          const { error: stockUpdateError } = await supabase
            .from("product_variants")
            .update({ stock: newStock })
            .eq("id", item.variant_id);

          if (stockUpdateError) {
            stockErrors.push(`Erreur stock article ${item.id}: ${stockUpdateError.message}`);
          }
        }
      }
    }

    // 3. Update order status to 'shipped' (EmballÃ©)
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateOrderError) {
      return NextResponse.json({
        success: false,
        message: "Erreur lors de la mise Ã  jour de la commande: " + updateOrderError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newStatus: "shipped",
      message: "SuccÃ¨s ! Commande passÃ©e Ã  l'Ã©tat EmballÃ©. Stock dÃ©crÃ©mentÃ© et commande verrouillÃ©e.",
      stockErrors: stockErrors.length > 0 ? stockErrors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}