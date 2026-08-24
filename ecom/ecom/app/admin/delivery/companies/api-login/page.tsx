"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Truck, Save, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
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
  api_base_url: string | null;
  api_key_header_name: string | null;
  test_endpoint_path: string | null;
  login_url: string | null;
  tracking_url_template: string | null;
  connection_status: string | null;
  last_tested_at: string | null;
};

export default function ApiLoginPage() {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [portalLogin, setPortalLogin] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiKeyHeaderName, setApiKeyHeaderName] = useState("X-API-Key");
  const [testEndpointPath, setTestEndpointPath] = useState("/");
  const [loginUrl, setLoginUrl] = useState("");
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.from("delivery_companies").select("*").order("name", { ascending: true });
      if (error) toast.error("Erreur: " + error.message);
      else if (data) setCompanies(data as DeliveryCompany[]);
      setIsLoading(false);
    };
    fetchCompanies();
  }, [supabase]);

  useEffect(() => {
    if (selectedCompanyId) {
      const c = companies.find((c) => c.id === selectedCompanyId);
      if (!c) return;
      setApiKey(c.api_key || "");
      setApiSecret(c.api_secret || "");
      setPortalLogin(c.portal_login || "");
      setPortalPassword(c.portal_password || "");
      setApiBaseUrl(c.api_base_url || "");
      setApiKeyHeaderName(c.api_key_header_name || "X-API-Key");
      setTestEndpointPath(c.test_endpoint_path || "/");
      setLoginUrl(c.login_url || "");
      setTrackingUrlTemplate(c.tracking_url_template || "");
      setConnectionStatus(c.connection_status || null);
      setLastTestedAt(c.last_tested_at || null);
    } else {
      setApiKey(""); setApiSecret(""); setPortalLogin(""); setPortalPassword("");
      setApiBaseUrl(""); setApiKeyHeaderName("X-API-Key"); setTestEndpointPath("/");
      setLoginUrl(""); setTrackingUrlTemplate(""); setConnectionStatus(null); setLastTestedAt(null);
    }
  }, [selectedCompanyId, companies]);

  const handleSave = async () => {
    if (!selectedCompanyId) { toast.error("Selectionnez une societe"); return; }
    setIsSaving(true);
    const { error } = await supabase.from("delivery_companies").update({
      api_key: apiKey || null, api_secret: apiSecret || null,
      portal_login: portalLogin || null, portal_password: portalPassword || null,
      api_base_url: apiBaseUrl || null, api_key_header_name: apiKeyHeaderName || "X-API-Key",
      test_endpoint_path: testEndpointPath || "/", login_url: loginUrl || null,
      tracking_url_template: trackingUrlTemplate || null,
    } as any).eq("id", selectedCompanyId);
    if (error) toast.error("Erreur: " + error.message);
    else toast.success("Acces sauvegardes !");
    setIsSaving(false);
  };

  const handleTestConnection = async () => {
    if (!selectedCompanyId) { toast.error("Selectionnez une societe"); return; }
    await handleSave();
    setIsTesting(true);
    try {
      const res = await fetch("/api/admin/delivery/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: selectedCompanyId }),
      });
      const result = await res.json();
      if (result.success) { toast.success(result.message); setConnectionStatus("connected"); }
      else { toast.error(result.message); setConnectionStatus("failed"); }
      setLastTestedAt(new Date().toISOString());
      setCompanies(prev => prev.map(c => c.id === selectedCompanyId
        ? { ...c, connection_status: result.success ? "connected" : "failed", last_tested_at: new Date().toISOString() } : c));
    } catch { toast.error("Impossible de contacter le serveur de test."); }
    setIsTesting(false);
  };

  const StatusBadge = () => {
    if (!connectionStatus || connectionStatus === "untested")
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 text-gray-600"><RefreshCw className="h-3 w-3" /> Non teste</span>;
    if (connectionStatus === "connected")
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-semibold"><Wifi className="h-3 w-3" /> Connecte</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-600 font-semibold"><WifiOff className="h-3 w-3" /> Erreur</span>;
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="w-full flex flex-col gap-6 justify-start max-w-2xl mx-auto">
        <div className="flex flex-col items-start w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-medium text-yellow-800">
            <Truck className="inline mb-1 mr-2 size-7 md:size-8" strokeWidth={2.2} />
            API &amp; Connexion
          </h1>
          <p className="text-gray-600">Configurez et testez la connexion a chaque societe de livraison.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-6">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">Chargement...</div>
          ) : companies.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Aucune societe de livraison ajoutee.</div>
          ) : (
            <>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Societe de livraison</Label>
                <div className="flex gap-2 items-center">
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selectionnez une societe..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            {c.name}
                            {c.connection_status === "connected" && <span className="text-green-600 text-xs">Connecte</span>}
                            {c.connection_status === "failed" && <span className="text-red-500 text-xs">Erreur</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCompanyId && <StatusBadge />}
                </div>
                {lastTestedAt && <p className="text-xs text-gray-400 mt-1">Dernier test : {new Date(lastTestedAt).toLocaleString("fr-FR")}</p>}
              </div>

              {selectedCompanyId && (
                <div className="space-y-6 pt-4 border-t">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-800">
                      Renseignez la <strong>Cle API</strong> si le transporteur vous la fournie, sinon renseignez le <strong>Login</strong> et <strong>Mot de passe</strong>. Cliquez ensuite sur <strong>Tester la connexion</strong>.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-800 border-b pb-2">Connexion par Cle API</h3>
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">Cle API</Label>
                        <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Ex: sk_live_xxxxxxx" />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">Secret API (optionnel)</Label>
                        <Input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="**********" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-800 border-b pb-2">Connexion par Portail</h3>
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">Login / Email</Label>
                        <Input value={portalLogin} onChange={(e) => setPortalLogin(e.target.value)} placeholder="Ex: contact@maboite.com" />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</Label>
                        <Input type="password" value={portalPassword} onChange={(e) => setPortalPassword(e.target.value)} placeholder="**********" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">URL de Suivi (optionnel)</Label>
                    <Input value={trackingUrlTemplate} onChange={(e) => setTrackingUrlTemplate(e.target.value)} placeholder="Ex: https://www.aramex.com/track/{numero}" />
                    <p className="text-xs text-gray-400 mt-1">Utilisez {"{numero}"} pour le numero de tracking.</p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <button type="button" className="w-full flex justify-between items-center p-4 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setShowAdvanced(!showAdvanced)}>
                      <span>Configuration avancee - pour le test de connexion</span>
                      {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showAdvanced && (
                      <div className="p-4 space-y-4 bg-white">
                        <div className="bg-amber-50 border border-amber-100 rounded p-3 text-xs text-amber-800">
                          Disponible dans la documentation API du transporteur. Necessaire pour le bouton Tester la connexion.
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="block text-sm font-medium text-gray-700 mb-1">URL de base de l API</Label>
                            <Input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} placeholder="Ex: https://api.aramex.com" />
                          </div>
                          <div>
                            <Label className="block text-sm font-medium text-gray-700 mb-1">Nom du header API Key</Label>
                            <Input value={apiKeyHeaderName} onChange={(e) => setApiKeyHeaderName(e.target.value)} placeholder="Ex: X-API-Key ou Authorization" />
                          </div>
                          <div>
                            <Label className="block text-sm font-medium text-gray-700 mb-1">Chemin de test (API Key)</Label>
                            <Input value={testEndpointPath} onChange={(e) => setTestEndpointPath(e.target.value)} placeholder="Ex: /v1/ping ou /health" />
                          </div>
                          <div>
                            <Label className="block text-sm font-medium text-gray-700 mb-1">URL de connexion (Login/Mdp)</Label>
                            <Input value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)} placeholder="Ex: https://api.mondhl.com/auth/login" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleSave} disabled={isSaving || isTesting} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                      {isSaving ? "Sauvegarde..." : <><Save className="mr-2 h-4 w-4" /> Sauvegarder</>}
                    </Button>
                    <Button onClick={handleTestConnection} disabled={isTesting || isSaving} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                      {isTesting ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Test en cours...</> : <><Wifi className="mr-2 h-4 w-4" /> Tester la connexion</>}
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
