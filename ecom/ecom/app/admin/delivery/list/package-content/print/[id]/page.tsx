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
  const [origin, setOrigin] = useState("");
  
  // Paramètres de l'expéditeur (sauvegardés dans le navigateur)
  const [senderName, setSenderName] = useState("PharmaStore");
  const [senderMF, setSenderMF] = useState("1234567/X");
  const [senderAddress, setSenderAddress] = useState("Tunis, Tunisie");
  const [senderPhone, setSenderPhone] = useState("55 000 000");
  const [isEditingSender, setIsEditingSender] = useState(false);

  const supabase = createClientComponentClient();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    // Charger les paramètres locaux s'ils existent
    const savedName = localStorage.getItem("print_sender_name");
    const savedMF = localStorage.getItem("print_sender_mf");
    const savedAddress = localStorage.getItem("print_sender_address");
    const savedPhone = localStorage.getItem("print_sender_phone");
    
    if (savedName) setSenderName(savedName);
    if (savedMF) setSenderMF(savedMF);
    if (savedAddress) setSenderAddress(savedAddress);
    if (savedPhone) setSenderPhone(savedPhone);

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
      
      // Auto-print ONLY if we are not editing
      if (data && !isEditingSender) {
        setTimeout(() => {
          // On évite d'imprimer auto si on vient d'ouvrir pour éditer
          if (!localStorage.getItem("prevent_auto_print")) {
             window.print();
          }
          localStorage.removeItem("prevent_auto_print");
        }, 800);
      }
    };

    fetchOrderDetails();
  }, [orderId, supabase, isEditingSender]);

  const saveSenderInfo = () => {
    localStorage.setItem("print_sender_name", senderName);
    localStorage.setItem("print_sender_mf", senderMF);
    localStorage.setItem("print_sender_address", senderAddress);
    localStorage.setItem("print_sender_phone", senderPhone);
    setIsEditingSender(false);
  };

  if (isLoading) {
    return <div className="p-8 text-center font-sans">Chargement du bordereau...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-red-500 font-sans">Commande introuvable</div>;
  }

  const shortOrderId = order.id.split('-')[0].toUpperCase();
  const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR');
  
  // Utiliser les vrais champs de la commande pour l'adresse d'expédition
  const city = order.shipping_city || order.guest_info?.city || "Tunis";
  const address = order.shipping_address || order.guest_info?.address || "";
  const phone = order.shipping_phone || order.guest_info?.phone || "";
  const fullName = order.guest_info?.full_name || "Client";
  const raisonSociale = order.guest_info?.company_name || order.guest_info?.raison_sociale || "";
  const postalCode = order.guest_info?.postal_code || "";

  const isLocked = order.status === "shipped" || order.status === "delivered" || order.status === "processing";

  return (
    <div className="bg-white text-black p-4 mx-auto font-sans" style={{ maxWidth: '800px', minHeight: '100vh', fontSize: '13px' }}>
      
      {/* Locked notification header (screen only) */}
      {isLocked && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg flex items-center justify-between print:hidden text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">🔒 Bordereau Verrouillé :</span>
            <span>Les coordonnées et articles de ce bordereau sont figés suite à la transmission / emballage.</span>
          </div>
          <span className="bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded text-[11px] uppercase">
            {order.status === "shipped" ? "Emballé" : order.status === "processing" ? "Téléchargé" : order.status}
          </span>
        </div>
      )}

      {/* Modal d'édition des infos de l'expéditeur (invisible à l'impression) */}
      {isEditingSender && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96 flex flex-col gap-4">
            <h3 className="font-bold text-lg border-b pb-2">Infos de votre société</h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Nom de la société</label>
              <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} className="border rounded p-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Matricule Fiscale (M.F.)</label>
              <input type="text" value={senderMF} onChange={e => setSenderMF(e.target.value)} className="border rounded p-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Adresse</label>
              <input type="text" value={senderAddress} onChange={e => setSenderAddress(e.target.value)} className="border rounded p-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Téléphone</label>
              <input type="text" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} className="border rounded p-2" />
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setIsEditingSender(false)} className="px-4 py-2 bg-gray-200 rounded">Annuler</button>
              <button onClick={saveSenderInfo} className="px-4 py-2 bg-blue-600 text-white rounded font-medium">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Hide elements when actually printing */}
      <div className="border border-gray-300 p-6 rounded print:border-none print:p-0">
        
        {/* Header Row */}
        <div className="flex justify-between items-start mb-6">
          <div className="w-1/3">
            <h1 className="text-3xl font-black tracking-tighter uppercase">{senderName}</h1>
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
            <QRCodeSVG value={origin ? `${origin}/scan/${order.id}` : `https://parapharmacie.tn/scan/${order.id}`} size={100} />
            <div className="mt-2 font-bold text-lg border border-black px-2 py-1 uppercase text-center w-full">
              LGR(1/1)
            </div>
            <div className="mt-2 font-bold text-center underline uppercase">
              {senderName.substring(0, 10)} =&gt; {city.substring(0, 15)}
            </div>
            <div className="font-bold text-center uppercase">
              ({city})
            </div>
          </div>

          {/* Right: Sender and Receiver */}
          <div className="w-2/3 flex flex-col gap-2">
            
            {/* Sender Box */}
            <div className="border border-black flex flex-col">
              <div className="flex justify-between border-b border-black p-1">
                <span className="font-bold">EXPÉDITEUR:</span>
                <span className="font-bold text-lg">{senderName}</span>
              </div>
              <div className="p-1">
                <div>M.F. : {senderMF}</div>
                <div>Adresse : {senderAddress}</div>
                <div>Tél : {senderPhone}</div>
              </div>
            </div>

            {/* Receiver Box */}
            <div className="border border-black flex flex-col h-full">
              <div className="flex justify-between border-b border-black p-1 bg-gray-100">
                <span className="font-bold">DESTINATAIRE:</span>
                <span className="font-bold text-lg">{fullName}</span>
              </div>
              <div className="p-1">
                {raisonSociale && <div><span className="font-medium">R.S:</span> {raisonSociale}</div>}
                <div><span className="font-medium">Adresse:</span> {address} / {city}</div>
                <div><span className="font-medium">Tel:</span> <span className="font-bold">{phone}</span></div>
                {postalCode && <div><span className="font-medium">Code Postal:</span> {postalCode}</div>}
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

        {/* Helper buttons */}
        <div className="mt-4 flex justify-center gap-4 print:hidden">
          <button 
            onClick={() => {
              localStorage.setItem("prevent_auto_print", "true");
              setIsEditingSender(true);
            }}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded shadow font-medium"
          >
            Modifier ma société
          </button>
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
