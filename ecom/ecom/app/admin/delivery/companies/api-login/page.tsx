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
  api_key: string | null;
  api_secret: string | null;
};

export default function ApiLoginPage() {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClientComponentClient();

  const fetchCompanies = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("delivery_companies")
      .select("id, name, api_key, api_secret")
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
      setApiKey(company?.api_key || "");
      setApiSecret(company?.api_secret || "");
    } else {
      setApiKey("");
      setApiSecret("");
    }
  }, [selectedCompanyId, companies]);

  const handleSave = async () => {
    if (!selectedCompanyId) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from("delivery_companies")
      .update({
        api_key: apiKey.trim() || null,
        api_secret: apiSecret.trim() || null,
      })
      .eq("id", selectedCompanyId);

    if (error) {
      toast.error("Erreur lors de la sauvegarde: " + error.message);
    } else {
      toast.success("Identifiants API sauvegardés !");
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
            API & Connexion
          </h1>
          <p className="text-gray-600">
            Connectez votre site au système de vos transporteurs pour une expédition automatisée.
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
                      Clé API (API Key)
                    </Label>
                    <Input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Ex: sk_live_xxxxxxxxxxxxxxxxxxxxx"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Mot de passe / Secret API (Optionnel)
                    </Label>
                    <Input
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full"
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving} 
                      className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
                    >
                      {isSaving ? "Sauvegarde..." : <><Save className="mr-2 h-4 w-4" /> Sauvegarder les accès</>}
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
