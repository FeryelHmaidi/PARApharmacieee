import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type PublicDatabase = Omit<Database, "__InternalSupabase">;

export type TypedSupabaseClient = SupabaseClient<PublicDatabase, "public">;
