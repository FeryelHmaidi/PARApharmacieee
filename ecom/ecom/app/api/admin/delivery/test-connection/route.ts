import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testBigBossAuth } from "@/lib/delivery/bigboss";

type CompanyRecord = {
  id: string;
  name?: string;
  api_key?: string | null;
  api_secret?: string | null;
  portal_login?: string | null;
  portal_password?: string | null;
  api_base_url?: string | null;
  api_key_header_name?: string | null;
  test_endpoint_path?: string | null;
  login_url?: string | null;
};

async function tryFetch(url: string, init: RequestInit) {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    return { ok: res.ok, status: res.status, statusText: res.statusText, text: await res.text() };
  } catch (e: any) {
    return { ok: false, status: 0, statusText: e?.message || String(e), text: "" };
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const companyId = body.company_id;
  if (!companyId) return NextResponse.json({ success: false, message: "company_id requis" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.from("delivery_companies").select("*").eq("id", companyId).single();
  if (error || !data) {
    return NextResponse.json({ success: false, message: "Société introuvable" }, { status: 404 });
  }

  const c = data as CompanyRecord;
  const now = new Date().toISOString();

  let finalMessage = "Test non effectué";
  let success = false;

  const isBigBoss =
    c.name?.toLowerCase().includes("bigboss") ||
    c.portal_login?.toLowerCase().includes("bigboss") ||
    c.api_base_url?.toLowerCase().includes("bigboss");

  // Specialized test for BigBoss Express
  if (isBigBoss && c.portal_login && c.portal_password) {
    const baseUrl = c.api_base_url || "https://my.bigbossexpress.tn";
    const bbResult = await testBigBossAuth(c.portal_login, c.portal_password, baseUrl);
    success = bbResult.success;
    finalMessage = bbResult.message;
  } else if (c.api_key && c.api_base_url && c.test_endpoint_path) {
    // API Key test
    const base = c.api_base_url.replace(/\/$/, "");
    const path = c.test_endpoint_path.startsWith("/") ? c.test_endpoint_path : `/${c.test_endpoint_path}`;
    const url = base + path;

    const headerName = c.api_key_header_name || "X-API-Key";
    const init: RequestInit = { method: "GET", headers: { [headerName]: c.api_key } };
    const res = await tryFetch(url, init);
    if (res.ok) {
      success = true;
      finalMessage = `Connecté (${res.status})`;
    } else if (headerName.toLowerCase() === "authorization") {
      const res2 = await tryFetch(url, { method: "GET", headers: { Authorization: `Bearer ${c.api_key}` } });
      if (res2.ok) {
        success = true;
        finalMessage = `Connecté (${res2.status})`;
      } else {
        finalMessage = `Erreur ${res.status}: ${res.statusText}`;
      }
    } else {
      finalMessage = `Erreur ${res.status}: ${res.statusText}`;
    }
  } else if (c.portal_login && c.portal_password) {
    // Generic portal login test
    const loginUrl = c.login_url || `${(c.api_base_url || "").replace(/\/$/, "")}/api/v1/auth/login`;
    if (loginUrl.startsWith("http")) {
      const attempts = [
        { body: { login: c.portal_login, password: c.portal_password }, type: "json" },
        { body: { email: c.portal_login, password: c.portal_password }, type: "json" },
        { body: { username: c.portal_login, password: c.portal_password }, type: "json" },
      ];

      for (const a of attempts) {
        const res = await tryFetch(loginUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(a.body),
        });
        if (res.ok) {
          success = true;
          finalMessage = `Connecté (${res.status})`;
          break;
        }
      }
      if (!success) finalMessage = "Identifiants ou URL de connexion incorrects";
    } else {
      finalMessage = "Veuillez renseigner une URL de base ou URL de connexion";
    }
  } else {
    finalMessage = "Renseignez la Clé API ou Login / Mot de passe pour tester";
  }

  // Persist status
  try {
    await supabase
      .from("delivery_companies")
      .update({ connection_status: success ? "connected" : "failed", last_tested_at: now })
      .eq("id", companyId);
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ success, message: finalMessage });
}
