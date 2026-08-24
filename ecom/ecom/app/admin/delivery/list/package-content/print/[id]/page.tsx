"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

export default function PrintSlipPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            product:products(name, description),
            variant:product_variants(price)
          )
        `)
        .eq("id", orderId)
        .single();

      if (!error && data) {
        setOrder(data);
      }
      setIsLoading(false);
      
      if (data) {
        setTimeout(() => {
          window.print();
        }, 800);
      }
    };

    fetchOrderDetails();
  }, [orderId, supabase]);

  if (isLoading) {
    return <div className="p-8 text-center font-sans">Chargement du bordereau...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-red-500 font-sans">Commande introuvable</div>;
  }

  const shortOrderId = order.id.split('-')[0].toUpperCase();
  const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR');
  const city = order.guest_info?.city || order.guest_info?.address || "Tunis";
  
  // Calculate total from items to show in table (excluding shipping if they want only product total, 
  // but PRIX TOTAL usually means what the client pays, which is total_amount)
  const itemsTotal = order.order_items?.reduce((sum: number, item: any) => sum + ((item.variant?.price || 0) * item.quantity), 0) || 0;

  return (
    <div className="bg-white text-black p-4 mx-auto font-sans" style={{ maxWidth: '800px', minHeight: '100vh', fontSize: '13px' }}>
      
      {/* Hide elements when actually printing */}
      <div className="border border-gray-300 p-6 rounded print:border-none print:p-0">
        
        {/* Header Row */}
        <div className="flex justify-between items-start mb-6">
          <div className="w-1/3">
            <h1 className="text-3xl font-black tracking-tighter">PharmaStore</h1>
          </div>
          <div className="w-1/3 text-center font-bold text-lg">
            Bon de Livraison N°:
            <div className="text-xl mt-1">{shortOrderId}</div>
          </div>
          <div className="w-1/3 text-right font-bold text-lg">
            {orderDate}
          </div>
        </div>

        {/* Middle Section */}
        <div className="flex gap-4 mb-4">
          
          {/* Left: QR Code & Routing */}
          <div className="w-1/3 flex flex-col items-center justify-center border border-black p-2">
            <QRCodeSVG value={order.id} size={100} />
            <div className="mt-2 font-bold text-lg border border-black px-2 py-1 uppercase text-center w-full">
              LGR(1/1)
            </div>
            <div className="mt-2 font-bold text-center underline uppercase">
              PHARMASTORE =&gt; {city.substring(0, 15)}
            </div>
            <div className="font-bold text-center">
              ({city})
            </div>
          </div>

          {/* Right: Sender and Receiver */}
          <div className="w-2/3 flex flex-col gap-2">
            
            {/* Sender Box */}
            <div className="border border-black flex flex-col">
              <div className="flex justify-between border-b border-black p-1">
                <span className="font-bold">EXPÉDITEUR:</span>
                <span className="font-bold text-lg">PharmaStore</span>
              </div>
              <div className="p-1">
                <div>M.F. : 1234567/X</div>
                <div>Adresse : Tunis, Tunisie</div>
              </div>
            </div>

            {/* Receiver Box */}
            <div className="border border-black flex flex-col h-full">
              <div className="flex justify-between border-b border-black p-1 bg-gray-100">
                <span className="font-bold">DESTINATAIRE:</span>
                <span className="font-bold text-lg">{order.guest_info?.full_name || "Client"}</span>
              </div>
              <div className="p-1">
                <div>Adresse: {order.guest_info?.address} / {city}</div>
                <div>Tel: <span className="font-bold">{order.guest_info?.phone}</span></div>
                {order.guest_info?.postal_code && <div>Code Postal: {order.guest_info.postal_code}</div>}
              </div>
            </div>

          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border border-black text-center text-xs mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left w-1/2">Désignation</th>
              <th className="border border-black p-2">Qté</th>
              <th className="border border-black p-2">PU HT</th>
              <th className="border border-black p-2">TVA</th>
              <th className="border border-black p-2">MT TVA</th>
              <th className="border border-black p-2">MT TTC</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item: any, index: number) => {
              const price = item.variant?.price || 0;
              const total = price * item.quantity;
              return (
                <tr key={index}>
                  <td className="border border-black p-2 text-left truncate max-w-[200px]">
                    {item.product?.name || "Produit inconnu"}
                  </td>
                  <td className="border border-black p-2">{item.quantity}</td>
                  <td className="border border-black p-2">{price.toFixed(3)}</td>
                  <td className="border border-black p-2">0%</td>
                  <td className="border border-black p-2">0.000</td>
                  <td className="border border-black p-2 font-bold">{total.toFixed(3)}</td>
                </tr>
              )
            })}
            
            {/* Delivery row in table if applicable */}
            {order.shipping_fee > 0 && (
              <tr>
                <td className="border border-black p-2 text-left">Frais de livraison</td>
                <td className="border border-black p-2">1</td>
                <td className="border border-black p-2">{Number(order.shipping_fee).toFixed(3)}</td>
                <td className="border border-black p-2">0%</td>
                <td className="border border-black p-2">0.000</td>
                <td className="border border-black p-2 font-bold">{Number(order.shipping_fee).toFixed(3)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Total Section */}
        <div className="flex justify-between items-end mb-4 border-b border-black pb-2">
          <div className="font-bold text-xl uppercase tracking-widest text-gray-700">
            PRIX TOTAL :
          </div>
          <div className="font-black text-2xl">
            {Number(order.total_amount || 0).toFixed(3)} DT
          </div>
        </div>

        {/* Footer Section */}
        <div className="flex justify-between items-end">
          {/* Transporter Details */}
          <div className="text-sm">
            <div className="font-bold">Transporteur : {order.delivery_company || "Standard"}</div>
            <div>{order.payment_method === 'cash_on_delivery' ? 'Paiement à la livraison' : 'Paiement en ligne'}</div>
          </div>

          {/* Barcode and Checkboxes */}
          <div className="flex gap-8 items-end">
            <div className="flex flex-col gap-2 border p-2 text-sm bg-gray-50">
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" className="w-4 h-4 text-green-600" /> FRAGILE
              </label>
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" className="w-4 h-4 text-green-600" defaultChecked /> Autorisation d'ouverture
              </label>
            </div>
            
            <div className="flex flex-col items-center">
              <Barcode 
                value={shortOrderId} 
                height={40} 
                width={1.5} 
                displayValue={false} 
                margin={0} 
              />
              <span className="text-xs mt-1 font-mono">{shortOrderId}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400 border-t pt-2 print:hidden">
          Pour une impression parfaite, réglez les marges sur "Aucune" ou "Minimum" dans la fenêtre d'impression.
        </div>

        {/* Helper button for manual print */}
        <div className="mt-4 text-center print:hidden">
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-2 rounded shadow font-medium"
          >
            Imprimer manuellement
          </button>
        </div>

      </div>
    </div>
  );
}
