"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Trash2, Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DeliveryCompany = {
  id: string;
  name: string;
  created_at: string;
};

export default function DeliveryCompaniesPage() {
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClientComponentClient();

  const fetchCompanies = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("delivery_companies")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Failed to load delivery companies: " + error.message);
    } else {
      setCompanies(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, [supabase]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from("delivery_companies")
        .insert({ 
          name: newName.trim(),
        });

      if (insertError) throw new Error(insertError.message);

      toast.success("Société de livraison ajoutée avec succès !");
      setNewName("");
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette société de livraison ?")) return;

    const { error } = await supabase
      .from("delivery_companies")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression: " + error.message);
      return;
    }

    toast.success("Société de livraison supprimée !");
    fetchCompanies();
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="w-full flex flex-col gap-6 justify-start max-w-4xl mx-auto">
        <div className="flex flex-col items-start w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-medium text-yellow-800">
            <Truck className="inline mb-1 mr-2 size-7 md:size-8" strokeWidth={2.2} />
            Sociétés de livraison
          </h1>
          <p className="text-gray-600">Gérez les sociétés de livraison pour l'expédition de vos commandes.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <form onSubmit={handleAdd} className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la société</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Aramex, Poste Tunisienne..."
                  className="w-full"
                  required
                />
              </div>
              
              <Button type="submit" disabled={!newName.trim() || isSubmitting} className="bg-yellow-600 hover:bg-yellow-700 text-white w-full md:w-auto">
                {isSubmitting ? "Ajout..." : <><Plus className="mr-2 h-4 w-4" /> Ajouter</>}
              </Button>
            </div>
          </form>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune société trouvée.</div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 font-medium text-gray-700">Nom de la société</th>
                    <th className="p-3 font-medium text-gray-700 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{company.name}</td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(company.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
