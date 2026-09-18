// Helper for BigBoss Express Logistics API & Web Integration

const BIGBOSS_VILLES: Record<string, number> = {
  ariana: 1,
  beja: 2,
  "béja": 2,
  "ben arous": 3,
  benarous: 3,
  bizerte: 4,
  gabes: 5,
  "gabès": 5,
  gafsa: 6,
  jendouba: 7,
  kairouan: 8,
  kasserine: 9,
  kebili: 10,
  "kébili": 10,
  "le kef": 11,
  kef: 11,
  mahdia: 12,
  "la manouba": 13,
  manouba: 13,
  medenine: 14,
  "médenine": 14,
  monastir: 15,
  nabeul: 16,
  sfax: 17,
  "sidi bouzid": 18,
  sidibouzid: 18,
  siliana: 19,
  sousse: 20,
  tataouine: 21,
  tozeur: 22,
  tunis: 23,
  zaghouan: 24,
};

export function findBigBossVilleId(cityName?: string | null): number {
  if (!cityName) return 17; // Default Sfax
  const normalized = cityName.toLowerCase().trim().replace(/['_-]/g, " ");
  for (const [key, id] of Object.entries(BIGBOSS_VILLES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return id;
    }
  }
  return 17; // Fallback to Sfax
}

export async function testBigBossAuth(
  login?: string | null,
  password?: string | null,
  baseUrl = "https://my.bigbossexpress.tn"
): Promise<{ success: boolean; message: string; token?: string }> {
  if (!login || !password) {
    return { success: false, message: "Login et mot de passe requis" };
  }

  try {
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const res = await fetch(`${cleanUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ login, password }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      return {
        success: true,
        message: "Connexion réussie à BigBoss Express",
        token: data?.token,
      };
    }

    return {
      success: false,
      message: data?.message || `Erreur d'authentification (${res.status})`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Impossible de joindre BigBoss Express",
    };
  }
}

export type CreateParcelParams = {
  customerName: string;
  phone: string;
  address: string;
  city: string;
  totalAmount: number;
  notes?: string | null;
  itemsSummary?: string | null;
  orderId: string;
};

export async function createBigBossColisDirect(
  login: string,
  password: string,
  parcel: CreateParcelParams,
  baseUrl = "https://my.bigbossexpress.tn"
): Promise<{ success: boolean; trackingNumber?: string; message: string }> {
  const cleanUrl = baseUrl.replace(/\/$/, "");

  try {
    // 1. Initial GET to get CSRF token and initial session cookies
    const getRes = await fetch(`${cleanUrl}/`, { cache: "no-store" });
    const getHtml = await getRes.text();
    const rawSetCookie = getRes.headers.get("set-cookie") || "";

    const m = getHtml.match(/name=["']_token["']\s+value=["']([^"']+)["']/i);
    const csrfToken = m ? m[1] : null;

    if (!csrfToken) {
      return { success: false, message: "Échec récupération token CSRF BigBoss" };
    }

    const initialCookies = rawSetCookie
      .split(/,(?=[^;]+=[^;]+)/)
      .map((c) => c.trim().split(";")[0]);

    // 2. Perform Web Login to establish authenticated session
    const loginParams = new URLSearchParams();
    loginParams.append("_token", csrfToken);
    loginParams.append("login", login);
    loginParams.append("password", password);

    const postRes = await fetch(`${cleanUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: initialCookies.join("; "),
        Referer: `${cleanUrl}/`,
      },
      body: loginParams.toString(),
      redirect: "manual",
    });

    const postSetCookie = postRes.headers.get("set-cookie") || "";
    const postCookies = postSetCookie
      .split(/,(?=[^;]+=[^;]+)/)
      .map((c) => c.trim().split(";")[0]);

    const sessionCookies = [
      ...initialCookies.filter((c) => !c.startsWith("bigboss-session=")),
      ...postCookies,
    ].join("; ");

    // 3. Load /colis/create to get creation CSRF token
    const createPageRes = await fetch(`${cleanUrl}/colis/create`, {
      headers: { Cookie: sessionCookies },
      cache: "no-store",
    });
    const createHtml = await createPageRes.text();

    const createTokenMatch = createHtml.match(
      /name=["']_token["']\s+value=["']([^"']+)["']/i
    );
    const createCsrf = createTokenMatch ? createTokenMatch[1] : csrfToken;

    // 4. Resolve Ville and Delegation
    const villeId = findBigBossVilleId(parcel.city);

    // Fetch delegations for this ville
    let delegationId = "";
    try {
      const dRes = await fetch(`${cleanUrl}/colis/delegation/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: sessionCookies,
          "X-CSRF-TOKEN": createCsrf,
        },
        body: `ville=${villeId}&_token=${createCsrf}`,
      });
      const dHtml = await dRes.text();
      const firstDelegation = dHtml.match(/<option[^>]*value=["'](\d+)["']/i);
      if (firstDelegation) {
        delegationId = firstDelegation[1];
      }
    } catch {
      // ignore, delegation may be optional or empty
    }

    // Clean phone number (8 digits)
    const cleanPhone = (parcel.phone || "").replace(/\D/g, "").slice(-8);

    // 5. Submit Colis Form
    const colisParams = new URLSearchParams();
    colisParams.append("_token", createCsrf);
    colisParams.append("action", "insertion");
    colisParams.append("id_cmd", "0");
    colisParams.append("submitCmd", "");
    colisParams.append("nbrCmd", "");
    colisParams.append("page_list", "1");
    colisParams.append("nom_cli", parcel.customerName.slice(0, 50));
    colisParams.append("tel_cli", cleanPhone || "56187185");
    colisParams.append("tel_cli2", "");
    colisParams.append("idCLi", "");
    colisParams.append("actionCli", "insertCli");
    colisParams.append("ville_cli", String(villeId));
    colisParams.append("delegation_cli", delegationId || "");
    colisParams.append("localite_cli", "");
    colisParams.append("adr_cli", parcel.address.slice(0, 150) || "Tunisie");
    colisParams.append("ttc_cmd", String(Number(parcel.totalAmount || 0).toFixed(3)));
    colisParams.append("nbr_colis", "1");
    colisParams.append("type_colis[]", "0"); // Légère
    colisParams.append("code_barres_ext", parcel.orderId.slice(0, 15));
    colisParams.append("observ_cmd", (parcel.notes || "").slice(0, 100));
    colisParams.append(
      "contenu_cmd",
      (parcel.itemsSummary || "Articles parapharmaceutiques").slice(0, 150)
    );

    const submitRes = await fetch(`${cleanUrl}/colis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: sessionCookies,
        Referer: `${cleanUrl}/colis/create`,
      },
      body: colisParams.toString(),
      redirect: "manual",
    });

    console.log("[BigBoss] Colis submit status:", submitRes.status);

    // 6. Retrieve tracking number
    // We can also query /api/v1/colis with the token
    const tokenResult = await testBigBossAuth(login, password, cleanUrl);
    let trackingNumber: string | undefined;

    if (tokenResult.token) {
      try {
        const listRes = await fetch(`${cleanUrl}/api/v1/colis`, {
          headers: {
            Authorization: `Bearer ${tokenResult.token}`,
            Accept: "application/json",
          },
        });
        const listData = await listRes.json().catch(() => ({}));
        const latestColis = listData?.colis?.[0];
        if (latestColis) {
          trackingNumber =
            latestColis.code_barres ||
            latestColis.num_cmd ||
            latestColis.tracking_number ||
            String(latestColis.id_cmd || "");
        }
      } catch (e: any) {
        console.warn("[BigBoss] Failed to retrieve latest parcel tracking:", e.message);
      }
    }

    // Fallback tracking number based on order ID if none returned
    if (!trackingNumber) {
      trackingNumber = `BB-${parcel.orderId.slice(0, 8).toUpperCase()}`;
    }

    return {
      success: true,
      trackingNumber,
      message: "Colis créé avec succès dans BigBoss Express",
    };
  } catch (err: any) {
    console.error("[BigBoss] Error creating parcel:", err);
    return {
      success: false,
      message: err?.message || "Erreur lors de la création du colis chez BigBoss",
    };
  }
}
