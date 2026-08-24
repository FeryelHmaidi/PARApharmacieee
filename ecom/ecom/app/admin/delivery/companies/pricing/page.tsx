"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Truck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type DeliveryCompany = {
  id: string;
  name: string;
  base_price: number | null;
  delivery_cost: number | null;
  return_fee: number | null;
};

export default function PricingPage() {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [basePrice, setBasePrice] = useState("");
  const [deliveryCost, setDeliveryCost] = useState("");
  const [returnFee, setReturnFee] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("delivery_companies")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        toast.error("Erreur: " + error.message);
      } else if (data) {
        setCompanies(data);
      }
      setIsLoading(false);
    };

    fetchCompanies();
  }, [supabase]);

  useEffect(() => {
    if (selectedCompanyId) {
      const company = companies.find((c) => c.id === selectedCompanyId);
      setBasePrice(company && company.base_price !== null ? String(company.base_price) : "");
      setDeliveryCost(company && company.delivery_cost !== null ? String(company.delivery_cost) : "");
      setReturnFee(company && company.return_fee !== null ? String(company.return_fee) : "");
    } else {
      setBasePrice("");
      setDeliveryCost("");
      setReturnFee("");
    }
  }, [selectedCompanyId, companies]);

  const handleSave = async () => {
    if (!selectedCompanyId) {
      toast.error("Veuillez sélectionner une société");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("delivery_companies")
      .update({ 
        base_price: basePrice ? parseFloat(basePrice) : null,
        delivery_cost: deliveryCost ? parseFloat(deliveryCost) : null,
        return_fee: returnFee ? parseFloat(returnFee) : null
      })
      .eq("id", selectedCompanyId);

    if (error) {
      toast.error("Erreur lors de la sauvegarde: " + error.message);
    } else {
      toast.success("Tarifs mis à jour avec succès !");
      setCompanies(companies.map(c => 
        c.id === selectedCompanyId 
          ? { 
              ...c, 
              base_price: basePrice ? parseFloat(basePrice) : null,
              delivery_cost: deliveryCost ? parseFloat(deliveryCost) : null,
              return_fee: returnFee ? parseFloat(returnFee) : null
            } 
          : c
      ));
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="w-full flex flex-col gap-6 justify-start max-w-2xl mx-auto">
        <div className="flex flex-col items-start w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-medium text-yellow-800">
            <Truck className="inline mb-1 mr-2 size-7 md:size-8" strokeWidth={2.2} />
            Prix de Livraison
          </h1>
          <p className="text-gray-600">
            Définissez le prix fixe par défaut pour chaque société de livraison.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-6">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Chargement...</div>
          ) : companies.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Aucune société de livraison n'a été ajoutée.
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Société de livraison
                </Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez une société" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCompanyId && (
                <div className="space-y-6 pt-4 border-t">
                  
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">Tarification Facturée au Client</h3>
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-1">
                        Prix de livraison (facturé au client en DT)
                      </Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        placeholder="Ex: 7.000"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Coûts Réels (Payés au Transporteur)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                          Coût d'expédition (DT)
                        </Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={deliveryCost}
                          onChange={(e) => setDeliveryCost(e.target.value)}
                          placeholder="Ex: 6.000"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                          Frais de retour (DT)
                        </Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={returnFee}
                          onChange={(e) => setReturnFee(e.target.value)}
                          placeholder="Ex: 3.500"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving} 
                      className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
                    >
                      {isSaving ? "Sauvegarde..." : <><Save className="mr-2 h-4 w-4" /> Sauvegarder les tarifs</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
