"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { TagRow } from "../types";

export function useCreateTag() {
  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();

  return useMutation<TagRow, Error, string>({
    mutationFn: async (name) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Tag name is required");

      const { data: existing, error: fetchError } = await supabase
        .from("tags")
        .select("*")
        .eq("name", trimmed)
        .maybeSingle();

      if (fetchError) throw new Error(fetchError.message);
      if (existing) return existing as TagRow;

      const { data, error } = await supabase
        .from("tags")
        .insert({ name: trimmed })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data as TagRow;
    },
    onSuccess: (tag) => {
      queryClient.setQueryData<TagRow[]>(["tags"], (previous) => {
        if (!previous) return [tag];
        const already = previous.find((item) => item.id === tag.id);
        if (already) {
          return previous.map((item) => (item.id === tag.id ? tag : item));
        }
        return [...previous, tag].sort((a, b) =>
          a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
        );
      });
    },
  });
}
