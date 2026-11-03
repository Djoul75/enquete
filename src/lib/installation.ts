// Ajout du jeu à l'écran d'accueil. Sur iPhone, c'est la seule façon de
// recevoir les notifications ; et l'app installée ne partage pas la connexion
// de Safari, d'où l'écran d'installation montré avant même de se connecter.

export type Appareil = "iphone" | "android" | "ordi";

export function appareil(): Appareil {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iphone";
  if (/Android/.test(ua)) return "android";
  return "ordi";
}

export function installee(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

const CLE_VU = "enquete-installer-vu";

export function installationAMontrer(): boolean {
  return appareil() !== "ordi" && !installee() && localStorage.getItem(CLE_VU) !== "1";
}

export function installationVue() {
  localStorage.setItem(CLE_VU, "1");
}

// Chrome sur Android propose sa propre fenêtre d'installation : on garde
// l'événement pour la déclencher depuis notre bouton.
type InvitationInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let invitation: InvitationInstall | null = null;
const abonnes = new Set<() => void>();

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  invitation = e as InvitationInstall;
  abonnes.forEach((f) => f());
});

export function invitationDisponible(): boolean {
  return invitation !== null;
}

export function surInvitation(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

export async function installer(): Promise<boolean> {
  if (!invitation) return false;
  await invitation.prompt();
  const { outcome } = await invitation.userChoice;
  invitation = null;
  return outcome === "accepted";
}
