import { supabase } from "./supabase";
import { VAPID_PUBLIC_KEY } from "./config";

// Les notifications passent par la table push_subscriptions de la
// plateforme (même projet Supabase, mêmes clés VAPID) ; c'est le worker
// du VPS qui les envoie. Sur iPhone, il faut d'abord ajouter le site à
// l'écran d'accueil.
export type EtatNotifs = "active" | "inactive" | "indisponible";

export function etatNotifications(): EtatNotifs {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "indisponible";
  return Notification.permission === "granted" && localStorage.getItem("enquete-notifs") === "1" ? "active" : "inactive";
}

function versOctets(base64: string): Uint8Array<ArrayBuffer> {
  const rembourre = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(rembourre);
  const octets = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i++) octets[i] = brut.charCodeAt(i);
  return octets;
}

export async function activerNotifications(): Promise<EtatNotifs> {
  if (etatNotifications() === "indisponible") return "indisponible";
  if ((await Notification.requestPermission()) !== "granted") return "inactive";

  const enregistrement = await navigator.serviceWorker.ready;
  const abonnement =
    (await enregistrement.pushManager.getSubscription()) ??
    (await enregistrement.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(VAPID_PUBLIC_KEY) }));

  const json = abonnement.toJSON();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !json.keys) return "inactive";
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: data.user.id, endpoint: abonnement.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    { onConflict: "endpoint" }
  );
  if (error) return "inactive";
  localStorage.setItem("enquete-notifs", "1");
  return "active";
}
