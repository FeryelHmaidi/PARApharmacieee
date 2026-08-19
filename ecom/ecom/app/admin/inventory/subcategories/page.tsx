"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Trash2, Plus, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = {
  id: string;
  name: string;
};

type Subcategory = {
  id: string;
  name: string;
  category_id: string;
  categories?: { name: string };
};

export default function SubcategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [newName, setNewName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch categories
    const { data: catData, error: catError } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
      
    if (catError) {
      toast.error("Failed to load categories: " + catError.message);
    } else {
      setCategories(catData || []);
      if (catData && catData.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(catData[0].id);
      }
    }

    // Fetch subcategories
    const { data: subData, error: subError } = await supabase
      .from("subcategories")
      .select("id, name, category_id, categories(name)")
      .order("name");
      
    if (subError) {
      toast.error("Failed to load subcategories: " + subError.message);
    } else {
      setSubcategories(subData || []);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !selectedCategoryId) return;

    const { error } = await supabase
      .from("subcategories")
      .insert({ 
        name: newName.trim(),
        category_id: selectedCategoryId
      });

    if (error) {
      toast.error("Error adding subcategory: " + error.message);
    } else {
      toast.success("Subcategory added!");
      setNewName("");
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this subcategory?")) return;

    const { error } = await supabase
      .from("subcategories")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Error deleting subcategory: " + error.message);
    } else {
      toast.success("Subcategory deleted!");
      fetchData();
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="w-full flex flex-col gap-6 justify-start max-w-4xl mx-auto">
        <div className="flex flex-col items-start w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-medium text-yellow-800">
            <ListTree className="inline mb-1 mr-2 size-7 md:size-8" strokeWidth={2.2} />
            Sous-catégories
          </h1>
          <p className="text-gray-600">Gérez les sous-catégories associées à chaque catégorie principale.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <form onSubmit={handleAdd} className="flex gap-4 items-end mb-8 flex-wrap md:flex-nowrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie Parente</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="" disabled>Sélectionnez une catégorie...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle sous-catégorie</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Sérum, Crème Hydratante..."
                className="w-full"
                required
              />
            </div>
            <Button type="submit" disabled={!newName.trim() || !selectedCategoryId} className="bg-yellow-600 hover:bg-yellow-700 text-white w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </form>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : subcategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune sous-catégorie trouvée.</div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 font-medium text-gray-700">Nom de la sous-catégorie</th>
                    <th className="p-3 font-medium text-gray-700">Catégorie Parente</th>
                    <th className="p-3 font-medium text-gray-700 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subcategories.map((subcat) => (
                    <tr key={subcat.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{subcat.name}</td>
                      <td className="p-3 text-gray-600">
                        {subcat.categories?.name || <span className="text-red-400">Inconnue</span>}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(subcat.id)}
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
