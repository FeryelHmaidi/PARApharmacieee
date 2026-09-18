// Helper to resolve tracking URLs across different delivery companies in Tunisia

export function getTrackingUrl(
  trackingNumber?: string | null,
  deliveryCompany?: string | null,
  customTemplate?: string | null
): string {
  if (!trackingNumber) return "#";

  const cleanNum = encodeURIComponent(trackingNumber.trim());

  if (customTemplate && customTemplate.trim().length > 0) {
    if (customTemplate.includes("{numero}")) {
      return customTemplate.replace("{numero}", cleanNum);
    }
    if (customTemplate.includes("{tracking}")) {
      return customTemplate.replace("{tracking}", cleanNum);
    }
    return customTemplate.endsWith("/")
      ? `${customTemplate}${cleanNum}`
      : `${customTemplate}/${cleanNum}`;
  }

  const comp = (deliveryCompany || "").toLowerCase().trim();

  if (comp.includes("aramex")) {
    return `https://www.aramex.com/track/results?mode=0&ShipmentNumber=${cleanNum}`;
  }
  if (comp.includes("poste") || comp.includes("rapid")) {
    return `http://www.rapidposte.poste.tn/fr/suivi.html`;
  }
  if (comp.includes("first")) {
    return `https://firstdelivery.tn/suivi/${cleanNum}`;
  }

  // Default to BigBoss Express
  return `https://my.bigbossexpress.tn/track/${cleanNum}`;
}
