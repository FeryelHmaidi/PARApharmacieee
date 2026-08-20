"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Package } from "lucide-react";
import { useParams } from "next/navigation";

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
            product:products(name, description)
          )
        `)
        .eq("id", orderId)
        .single();

      if (!error && data) {
        setOrder(data);
      }
      setIsLoading(false);
      
      // Trigger print dialog automatically after data is loaded and rendered
      if (data) {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    };

    fetchOrderDetails();
  }, [orderId, supabase]);

  if (isLoading) {
    return <div className="p-8 text-center">Chargement du bordereau...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-red-500">Commande introuvable</div>;
  }

  const itemsCount = (order.order_items || []).reduce(
    (sum: number, item: any) => sum + (item.quantity || 1), 
    0
  );

  return (
    <div className="bg-white text-black p-8 max-w-3xl mx-auto" style={{ minHeight: '100vh' }}>
      {/* Hide elements when actually printing to ensure a clean layout, though this page is designed only for print */}
      <div className="border-2 border-gray-800 p-8 rounded-xl print:border-none print:p-0">
        <div className="flex justify-between items-start mb-12 border-b-2 border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              BORDEREAU D'EXPÉDITION
            </h1>
            <p className="text-gray-500 mt-2">Document généré le {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Numéro de Commande</div>
            <div className="text-2xl font-bold font-mono bg-gray-100 px-3 py-1 rounded inline-block">
              {order.id.split('-')[0].toUpperCase()}
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-500">Date de la commande :</span>
              <br />
              {new Date(order.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-bold mb-4 uppercase tracking-wider border-b border-gray-200 pb-2">Destinataire</h2>
            <div className="font-semibold text-lg">{order.guest_info?.full_name || "Client"}</div>
            <div className="text-gray-700 mt-2">
              {order.guest_info?.phone && <div className="mt-1 flex items-center"><span className="text-gray-500 w-16">Tél:</span> <strong>{order.guest_info.phone}</strong></div>}
              {order.guest_info?.address && <div className="mt-1 flex items-start"><span className="text-gray-500 w-16">Adresse:</span> <span>{order.guest_info.address}</span></div>}
              {order.guest_info?.postal_code && <div className="mt-1 flex items-center"><span className="text-gray-500 w-16">Code:</span> <span>{order.guest_info.postal_code}</span></div>}
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-bold mb-4 uppercase tracking-wider border-b border-gray-200 pb-2">Informations Logistiques</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Transporteur</div>
                  <div className="font-bold text-lg">{order.delivery_company || "Standard"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Mode de paiement</div>
                  <div className="font-bold">{order.payment_method === 'cash_on_delivery' ? 'Paiement à la livraison' : 'En ligne'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Nombre d'articles</div>
                  <div className="font-bold text-xl">{itemsCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-lg font-bold mb-4 uppercase tracking-wider">Valeur Déclarée / À Encaisser</h2>
          <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-xl flex justify-between items-center">
            <div className="text-yellow-800 font-medium text-lg">
              {order.payment_method === 'cash_on_delivery' 
                ? "Montant total à encaisser auprès du client à la livraison :" 
                : "Valeur déclarée de la marchandise (Déjà payée) :"}
            </div>
            <div className="text-3xl font-black text-black">
              {Number(order.total_amount || 0).toFixed(2).replace('.', ',')} DT
            </div>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-gray-300 pt-8 mt-12 text-center text-sm text-gray-500">
          <p>Ce document certifie la préparation du colis par le marchand.</p>
          <p className="mt-2 font-mono">Merci de votre confiance !</p>
        </div>
        
        {/* Helper button for the user to print manually if popup blocked */}
        <div className="mt-8 text-center print:hidden">
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow font-medium"
          >
            Imprimer maintenant
          </button>
        </div>
      </div>
    </div>
  );
}
