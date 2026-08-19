"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Trash2, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = {
  id: string;
  name: string;
  created_at: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  const fetchCategories = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Failed to load categories: " + error.message);
    } else {
      setCategories(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, [supabase]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const { error } = await supabase
      .from("categories")
      .insert({ name: newName.trim() });

    if (error) {
      toast.error("Error adding category: " + error.message);
    } else {
      toast.success("Category added!");
      setNewName("");
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error deleting category: " + error.message);
    } else {
      toast.success("Category deleted!");
      fetchCategories();
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="w-full flex flex-col gap-6 justify-start max-w-4xl mx-auto">
        <div className="flex flex-col items-start w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-medium text-yellow-800">
            <Tags className="inline mb-1 mr-2 size-7 md:size-8" strokeWidth={2.2} />
            Catégories
          </h1>
          <p className="text-gray-600">Gérez les catégories de produits affichées dans la liste déroulante.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <form onSubmit={handleAdd} className="flex gap-4 items-end mb-8">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle catégorie</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Visage, Solaire..."
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={!newName.trim()} className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </form>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune catégorie trouvée.</div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 font-medium text-gray-700">Nom</th>
                    <th className="p-3 font-medium text-gray-700 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="p-3">{cat.name}</td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cat.id)}
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
