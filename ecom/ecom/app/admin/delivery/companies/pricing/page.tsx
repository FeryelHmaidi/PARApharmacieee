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
};

export default function PricingPage() {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [basePrice, setBasePrice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClientComponentClient();

  const fetchCompanies = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("delivery_companies")
      .select("id, name, base_price")
      .order("name");
    
    if (error) {
      toast.error("Erreur de chargement: " + error.message);
    } else {
      setCompanies(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, [supabase]);

  // When selection changes, update the inputs
  useEffect(() => {
    if (selectedCompanyId) {
      const company = companies.find((c) => c.id === selectedCompanyId);
      setBasePrice(company && company.base_price !== null ? String(company.base_price) : "");
    } else {
      setBasePrice("");
    }
  }, [selectedCompanyId, companies]);

  const handleSave = async () => {
    if (!selectedCompanyId) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from("delivery_companies")
      .update({
        base_price: basePrice ? parseFloat(basePrice) : null,
      })
      .eq("id", selectedCompanyId);

    if (error) {
      toast.error("Erreur lors de la sauvegarde: " + error.message);
    } else {
      toast.success("Prix de livraison sauvegardé !");
      fetchCompanies(); // Refresh data
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
            <>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Société de livraison
                </Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez une société..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCompanyId && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix fixe (DT)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="Ex: 7.00"
                      className="w-full"
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving} 
                      className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
                    >
                      {isSaving ? "Sauvegarde..." : <><Save className="mr-2 h-4 w-4" /> Sauvegarder le prix</>}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
