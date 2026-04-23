import { db, doc, getDoc } from "./firebase-client.js";

const SETTINGS_REF = doc(db, "siteSettings", "public");

export async function applyPublicSiteSettings() {
  try {
    const snap = await getDoc(SETTINGS_REF);
    if (!snap.exists()) return;
    const d = snap.data();
    if (d.heroTitle) {
      const el = document.getElementById("hero-title");
      if (el) el.textContent = d.heroTitle;
    }
    if (d.heroLead) {
      const el = document.getElementById("hero-lead");
      if (el) el.textContent = d.heroLead;
    }
    if (d.ctaTitle) {
      const el = document.getElementById("cta-title");
      if (el) el.textContent = d.ctaTitle;
    }
    if (d.ctaLead) {
      const el = document.getElementById("cta-lead");
      if (el) el.textContent = d.ctaLead;
    }
  } catch {
    /* offline yoki ruxsat */
  }
}
