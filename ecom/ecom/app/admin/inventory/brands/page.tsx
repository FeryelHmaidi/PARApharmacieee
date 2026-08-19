"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { Trash2, Plus, Bookmark, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

type Brand = {
  id: string;
  name: string;
  brand_logo_url: string | null;
  created_at: string;
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newName, setNewName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();

  const fetchBrands = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Failed to load brands: " + error.message);
    } else {
      setBrands(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBrands();
  }, [supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo size must be less than 5MB");
      return;
    }

    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeFile = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    let uploadedUrl: string | null = null;

    try {
      // 1. Upload logo if exists
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `brands/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-photos")
          .upload(filePath, logoFile);

        if (uploadError) throw new Error("Erreur lors de l'upload du logo: " + uploadError.message);

        const { data: publicUrlData } = supabase.storage
          .from("product-photos")
          .getPublicUrl(filePath);

        uploadedUrl = publicUrlData.publicUrl;
      }

      // 2. Insert brand
      const { error: insertError } = await supabase
        .from("brands")
        .insert({ 
          name: newName.trim(),
          brand_logo_url: uploadedUrl
        });

      if (insertError) throw new Error(insertError.message);

      toast.success("Marque ajoutée avec succès !");
      setNewName("");
      removeFile();
      fetchBrands();
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, logoUrl: string | null) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette marque ?")) return;

    // Delete record (cascade could be used if there were relations, but here we just delete)
    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression: " + error.message);
      return;
    }

    // Attempt to delete logo from storage if it exists (Optional cleanup)
    if (logoUrl) {
      try {
        const urlParts = logoUrl.split("product-photos/");
        if (urlParts.length > 1) {
          const path = urlParts[1];
          await supabase.storage.from("product-photos").remove([path]);
        }
      } catch (e) {
        console.error("Failed to delete logo file from storage", e);
      }
    }

    toast.success("Marque supprimée !");
    fetchBrands();
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden p-4 md:p-8">
      <section className="w-full flex flex-col gap-6 justify-start max-w-4xl mx-auto">
        <div className="flex flex-col items-start w-full gap-4">
          <h1 className="text-2xl md:text-3xl font-medium text-yellow-800">
            <Bookmark className="inline mb-1 mr-2 size-7 md:size-8" strokeWidth={2.2} />
            Marques
          </h1>
          <p className="text-gray-600">Gérez les marques de vos produits et leurs logos.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <form onSubmit={handleAdd} className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la marque</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: SVR, Lirene..."
                  className="w-full"
                  required
                />
              </div>
              
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo (Optionnel)</label>
                <div className="flex items-center gap-3">
                  <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-accent hover:text-accent-foreground">
                    <Camera className="mr-2 h-4 w-4 text-gray-600" />
                    Choisir un logo
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                  {logoPreview && (
                    <div className="relative h-10 w-20 rounded border bg-gray-50 overflow-hidden flex items-center justify-center">
                      <img src={logoPreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={removeFile}
                        className="absolute right-0 top-0 rounded-bl bg-white/90 p-0.5 shadow-sm hover:bg-white"
                        title="Retirer"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={!newName.trim() || isSubmitting} className="bg-yellow-600 hover:bg-yellow-700 text-white w-full md:w-auto">
                {isSubmitting ? "Ajout..." : <><Plus className="mr-2 h-4 w-4" /> Ajouter</>}
              </Button>
            </div>
          </form>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : brands.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune marque trouvée.</div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 font-medium text-gray-700 w-24 text-center">Logo</th>
                    <th className="p-3 font-medium text-gray-700">Nom de la marque</th>
                    <th className="p-3 font-medium text-gray-700 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {brands.map((brand) => (
                    <tr key={brand.id} className="hover:bg-gray-50">
                      <td className="p-3 text-center">
                        {brand.brand_logo_url ? (
                          <div className="h-10 w-20 relative mx-auto bg-white rounded border">
                            <Image
                              src={brand.brand_logo_url}
                              alt={brand.name}
                              fill
                              className="object-contain p-1"
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Aucun</span>
                        )}
                      </td>
                      <td className="p-3 font-medium">{brand.name}</td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brand.id, brand.brand_logo_url)}
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
