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
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await req.json();
    const { company_id } = body;

    if (!company_id) {
      return NextResponse.json({ success: false, message: "company_id requis" }, { status: 400 });
    }

    // Fetch company from DB
    const { data: company, error: dbError } = await supabase
      .from("delivery_companies")
      .select("*")
      .eq("id", company_id)
      .single();

    if (dbError || !company) {
      return NextResponse.json({ success: false, message: "Société introuvable" }, { status: 404 });
    }

    const co = company as any;
    const apiBaseUrl: string = co.api_base_url || "";
    const testEndpointPath: string = co.test_endpoint_path || "/";
    const apiKeyHeaderName: string = co.api_key_header_name || "X-API-Key";
    const loginUrl: string = co.login_url || "";

    let testResult: { success: boolean; message: string; status?: number } = {
      success: false,
      message: "Aucune configuration de connexion trouvée. Veuillez renseigner les informations de connexion.",
    };

    // ---- METHOD 1: API KEY TEST ----
    if (co.api_key && apiBaseUrl) {
      try {
        const url = `${apiBaseUrl.replace(/\/$/, "")}${testEndpointPath}`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "application/json",
        };

        // Support "Bearer token" and plain API key headers
        if (apiKeyHeaderName.toLowerCase() === "authorization") {
          headers["Authorization"] = `Bearer ${co.api_key}`;
        } else {
          headers[apiKeyHeaderName] = co.api_key;
        }

        if (co.api_secret) {
          headers["X-API-Secret"] = co.api_secret;
        }

        const response = await fetch(url, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(8000),
        });

        if (response.status >= 200 && response.status < 300) {
          testResult = { success: true, message: `✅ Connexion réussie ! (HTTP ${response.status})`, status: response.status };
        } else if (response.status === 401 || response.status === 403) {
          testResult = { success: false, message: `❌ Clé API invalide ou refusée (HTTP ${response.status})`, status: response.status };
        } else if (response.status === 404) {
          testResult = { success: false, message: `❌ URL de test introuvable (HTTP 404). Vérifiez le chemin de test.`, status: 404 };
        } else {
          testResult = { success: false, message: `⚠️ Réponse inattendue HTTP ${response.status}`, status: response.status };
        }
      } catch (e: any) {
        testResult = { success: false, message: e.name === "TimeoutError" ? "⏱️ Timeout : le serveur du transporteur ne répond pas (8s)" : `❌ Erreur réseau : ${e.message}` };
      }
    }

    // ---- METHOD 2: LOGIN / PASSWORD TEST ----
    else if (co.portal_login && co.portal_password && loginUrl) {
      try {
        const response = await fetch(loginUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            username: co.portal_login,
            email: co.portal_login,
            password: co.portal_password,
            login: co.portal_login,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (response.status >= 200 && response.status < 300) {
          testResult = { success: true, message: `✅ Connexion réussie ! (HTTP ${response.status})`, status: response.status };
        } else if (response.status === 401 || response.status === 403) {
          testResult = { success: false, message: `❌ Login ou mot de passe incorrect (HTTP ${response.status})`, status: response.status };
        } else {
          testResult = { success: false, message: `⚠️ Erreur HTTP ${response.status} — vérifiez l'URL de connexion.`, status: response.status };
        }
      } catch (e: any) {
        testResult = { success: false, message: e.name === "TimeoutError" ? "⏱️ Timeout : le serveur du transporteur ne répond pas (8s)" : `❌ Erreur réseau : ${e.message}` };
      }
    }

    // Save connection status to DB
    await supabase
      .from("delivery_companies")
      .update({
        connection_status: testResult.success ? "connected" : "failed",
        last_tested_at: new Date().toISOString(),
      } as any)
      .eq("id", company_id);

    return NextResponse.json(testResult);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: `Erreur serveur: ${error.message}` }, { status: 500 });
  }
}

