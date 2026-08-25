import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Decide which test to run
  // Prefer API Key test if api_key and api_base_url + test_endpoint_path are provided
  let finalMessage = "Test non effectué";
  let success = false;

  if (c.api_key && c.api_base_url && c.test_endpoint_path) {
    // build URL
    const base = c.api_base_url.replace(/\/$/, "");
    const path = c.test_endpoint_path.startsWith("/") ? c.test_endpoint_path : `/${c.test_endpoint_path}`;
    const url = base + path;

    const headerName = c.api_key_header_name || "X-API-Key";
    // try raw key first
    const init: RequestInit = { method: "GET", headers: { [headerName]: c.api_key } };
    const res = await tryFetch(url, init);
    if (res.ok) {
      success = true;
      finalMessage = `Connecté (${res.status})`;
    } else if (headerName.toLowerCase() === "authorization") {
      // try with Bearer prefix as a fallback
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
  } else if (c.portal_login && c.portal_password && c.login_url) {
    // Try login flow - attempt common payloads
    const loginUrl = c.login_url;
    const attempts = [
      { body: { email: c.portal_login, password: c.portal_password }, type: "json" },
      { body: { username: c.portal_login, password: c.portal_password }, type: "json" },
      { body: new URLSearchParams({ username: c.portal_login, password: c.portal_password }).toString(), type: "form" },
      { body: new URLSearchParams({ email: c.portal_login, password: c.portal_password }).toString(), type: "form" },
    ];

    for (const a of attempts) {
      const headers: Record<string, string> = {};
      let bodyData: any = a.body;
      if (a.type === "json") {
        headers["Content-Type"] = "application/json";
        bodyData = JSON.stringify(a.body);
      } else {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }
      const res = await tryFetch(loginUrl, { method: "POST", headers, body: bodyData });
      // consider 200-299 as success, some APIs return 201 or 204
      if (res.ok) {
        success = true;
        finalMessage = `Connecté (${res.status})`;
        break;
      }
    }
    if (!success) finalMessage = `Erreur de connexion au endpoint de login`;
  } else {
    finalMessage = "Informations insuffisantes pour tester (api_key+base+path ou login+password+login_url requis)";
  }

  // Persist status
  try {
    await supabase
      .from("delivery_companies")
      .update({ connection_status: success ? "connected" : "failed", last_tested_at: now })
      .eq("id", companyId);
  } catch (e) {
    // ignore persistence errors for now
  }

  return NextResponse.json({ success, message: finalMessage });
}

