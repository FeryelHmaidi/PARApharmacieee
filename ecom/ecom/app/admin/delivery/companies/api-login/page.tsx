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
  portal_login: string | null;
  portal_password: string | null;
};

export default function ApiLoginPage() {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [portalLogin, setPortalLogin] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
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
      setApiKey(company?.api_key || "");
      setApiSecret(company?.api_secret || "");
      setPortalLogin(company?.portal_login || "");
      setPortalPassword(company?.portal_password || "");
    } else {
      setApiKey("");
      setApiSecret("");
      setPortalLogin("");
      setPortalPassword("");
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
        api_key: apiKey || null, 
        api_secret: apiSecret || null,
        portal_login: portalLogin || null,
        portal_password: portalPassword || null
      })
      .eq("id", selectedCompanyId);

    if (error) {
      toast.error("Erreur lors de la sauvegarde: " + error.message);
    } else {
      toast.success("Accès mis à jour avec succès !");
      setCompanies(companies.map(c => 
        c.id === selectedCompanyId 
          ? { ...c, api_key: apiKey || null, api_secret: apiSecret || null, portal_login: portalLogin || null, portal_password: portalPassword || null } 
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
                <div className="space-y-6 pt-4 border-t">
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                    <p className="text-sm text-blue-800">
                      Renseignez la <strong>Clé API</strong> si le transporteur vous l'a fournie. Sinon, renseignez l'<strong>Identifiant (Login)</strong> et le <strong>Mot de passe</strong> de votre espace client.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-800 border-b pb-2">Connexion par API</h3>
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
                          Secret API (Optionnel)
                        </Label>
                        <Input
                          type="password"
                          value={apiSecret}
                          onChange={(e) => setApiSecret(e.target.value)}
                          placeholder="••••••••••••••••"
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-800 border-b pb-2">Connexion par Portail</h3>
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                          Identifiant (Login / Email)
                        </Label>
                        <Input
                          value={portalLogin}
                          onChange={(e) => setPortalLogin(e.target.value)}
                          placeholder="Ex: contact@maboite.com"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                          Mot de passe
                        </Label>
                        <Input
                          type="password"
                          value={portalPassword}
                          onChange={(e) => setPortalPassword(e.target.value)}
                          placeholder="••••••••••••••••"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving} 
                      className="bg-yellow-600 hover:bg-yellow-700 text-white w-full md:w-auto"
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
