// Tâche du VPS pour Enquête, lancée par cron :
//   node worker/worker.mjs          chaque minute : affaires demandées par le
//                                   bouton, clôtures, notifications
//   node worker/worker.mjs hebdo    le lundi : l'affaire de la semaine
//   node worker/worker.mjs importer affaires/v2/*.json
//                                   range des affaires écrites à la main
//
// La base du jeu (adresse, clé service_role) est dans ~/enquete/.env. La clé
// Anthropic et les clés VAPID restent dans le .env.local de la plateforme :
// une seule clé Anthropic à renouveler.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { charger, verifier } from "./affaire.mjs";
import { ecrireAffaire } from "./ecrivain.mjs";

config({ path: "/home/ubuntu/enquete/.env", quiet: true });
config({ path: "/home/ubuntu/plateforme-perso/.env.local", quiet: true });

const SITE = "https://agencenoire.fr/";
const db = createClient(process.env.ENQUETE_SUPABASE_URL, process.env.ENQUETE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
webpush.setVapidDetails("mailto:jules.gorce@gmail.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

function journal(...morceaux) {
  console.log(new Date().toISOString(), ...morceaux);
}

async function verif(promesse) {
  const { data, error } = await promesse;
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function notifier(userIds, titre, corps, chemin = "") {
  if (userIds.length === 0) return;
  const abonnements = await verif(db.from("enquete_abonnements_push").select("*").in("user_id", userIds));
  for (const a of abonnements) {
    try {
      await webpush.sendNotification(
        { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
        JSON.stringify({ title: titre, body: corps, url: `${SITE}#${chemin}` })
      );
    } catch (e) {
      // Abonnement expiré ou révoqué : on l'oublie.
      if (e.statusCode === 404 || e.statusCode === 410) await db.from("enquete_abonnements_push").delete().eq("id", a.id);
      else journal("push en échec", a.id, e.statusCode ?? e.message);
    }
  }
}

async function nomsJoueurs() {
  const joueurs = await verif(db.from("enquete_joueurs").select("user_id, pseudo"));
  return Object.fromEntries(joueurs.map((j) => [j.user_id, j.pseudo]));
}

async function notificationsAssocies(noms) {
  const demandes = await verif(db.from("enquete_amities").select("de, a").is("acceptee_at", null).eq("notifie", false));
  for (const d of demandes) {
    await notifier([d.a], `${noms[d.de]} veut s'associer avec toi`, "Accepte sa demande dans l'onglet Associés.", "/associes");
    await db.from("enquete_amities").update({ notifie: true }).eq("de", d.de).eq("a", d.a);
  }
}

// Rendez-vous au bureau : invitations, rendez-vous oubliés (48 h), ouverture.
async function notificationsBureaux(noms) {
  const bureaux = await verif(
    db.from("enquete_parties").select("id, cree_par, created_at, enquete_participants(*)").is("lancee_at", null)
  );
  for (const b of bureaux) {
    if (Date.now() - new Date(b.created_at).getTime() > 48 * 3_600_000) {
      await verif(db.from("enquete_parties").delete().eq("id", b.id));
      journal("rendez-vous expiré", b.id);
      continue;
    }
    for (const invite of b.enquete_participants.filter((x) => x.statut === "invite" && !x.notifie_invitation)) {
      await notifier([invite.user_id], `${noms[b.cree_par]} a une affaire pour toi`, "Rendez-vous à son bureau. L'enveloppe s'ouvre quand tout le monde est assis.", `/bureau/${b.id}`);
      await db.from("enquete_participants").update({ notifie_invitation: true }).eq("partie_id", b.id).eq("user_id", invite.user_id);
    }
  }

  const ouvertes = await verif(
    db
      .from("enquete_parties")
      .select("id, cree_par, enquete_affaires(titre), enquete_participants(user_id)")
      .eq("mode", "groupe")
      .not("lancee_at", "is", null)
      .eq("notifie_lancement", false)
  );
  for (const p of ouvertes) {
    const autres = p.enquete_participants.map((x) => x.user_id).filter((id) => id !== p.cree_par);
    await notifier(autres, "L'enveloppe est ouverte", `${noms[p.cree_par]} a ouvert le dossier : ${p.enquete_affaires.titre}.`, `/p/${p.id}`);
    await db.from("enquete_parties").update({ notifie_lancement: true }).eq("id", p.id);
  }
}

async function notificationsParties(noms) {
  const parties = await verif(
    db
      .from("enquete_parties")
      .select("id, mode, echeance, revelee_at, notifie_revelation, enquete_affaires(titre), enquete_participants(*)")
      .not("lancee_at", "is", null)
      .or("revelee_at.is.null,notifie_revelation.eq.false")
  );

  for (const p of parties) {
    const titre = p.enquete_affaires.titre;
    const participants = p.enquete_participants;

    // Délai écoulé sans que personne ouvre le jeu : on clôt quand même.
    if (!p.revelee_at && p.echeance && new Date(p.echeance) < new Date()) {
      await verif(db.rpc("enquete_cloturer", { p_partie: p.id }));
      p.revelee_at = new Date().toISOString();
    }

    if (p.mode === "solo") {
      if (p.revelee_at && !p.notifie_revelation) await db.from("enquete_parties").update({ notifie_revelation: true }).eq("id", p.id);
      continue;
    }

    if (p.revelee_at) {
      if (!p.notifie_revelation) {
        await notifier(participants.map((x) => x.user_id), "La vérité éclate", `${titre} : le coupable est démasqué. Qui avait vu juste ?`, `/p/${p.id}`);
        await db.from("enquete_parties").update({ notifie_revelation: true }).eq("id", p.id);
      }
      continue;
    }

    for (const accusateur of participants.filter((x) => x.accuse_at && !x.notifie_accusation)) {
      const autres = participants.filter((x) => !x.accuse_at).map((x) => x.user_id);
      await notifier(autres, `${noms[accusateur.user_id]} a désigné un coupable`, `${titre} : tu as jusqu'à demain pour accuser à ton tour.`, `/p/${p.id}`);
      await db.from("enquete_participants").update({ notifie_accusation: true }).eq("partie_id", p.id).eq("user_id", accusateur.user_id);
    }

    if (p.echeance && new Date(p.echeance).getTime() - Date.now() < 2 * 3_600_000) {
      for (const retardataire of participants.filter((x) => !x.accuse_at && !x.notifie_rappel)) {
        await notifier([retardataire.user_id], "Plus que 2 heures", `${titre} : accuse avant que ton dossier soit classé.`, `/p/${p.id}`);
        await db.from("enquete_participants").update({ notifie_rappel: true }).eq("partie_id", p.id).eq("user_id", retardataire.user_id);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Nouvelles affaires
// ---------------------------------------------------------------------------

async function ranger(affaire, source) {
  const erreurs = verifier(affaire);
  if (erreurs.length) throw new Error(`${affaire.titre} : ${erreurs.join(" ; ")}`);
  const [ligne] = await verif(db.from("enquete_affaires").insert({ titre: affaire.titre, public: affaire.public, source, regle: 2 }).select("id"));
  await verif(db.from("enquete_affaires_secret").insert({ affaire_id: ligne.id, secret: affaire.secret }));
  return ligne.id;
}

async function ecrireEtRanger(source) {
  const deja = await verif(db.from("enquete_affaires").select("titre, public").eq("regle", 2));
  const affaire = await ecrireAffaire({
    dejaEcrites: deja.map((a) => ({ titre: a.titre, cadre: `${a.public.cadre.ville}, ${a.public.cadre.annee}` })),
  });
  const id = await ranger(affaire, source);
  journal("affaire écrite", id, affaire.titre);
  const joueurs = Object.keys(await nomsJoueurs());
  await notifier(joueurs, "Nouveau dossier", `${affaire.titre} — ${affaire.public.cadre.ville}, ${affaire.public.cadre.annee}.`);
  return id;
}

async function demandes() {
  const [demande] = await verif(db.from("enquete_demandes").select("*").eq("statut", "en_attente").order("id").limit(1));
  if (!demande) return;
  await verif(db.from("enquete_demandes").update({ statut: "en_cours" }).eq("id", demande.id));
  try {
    const id = await ecrireEtRanger("demande");
    await db.from("enquete_demandes").update({ statut: "faite", affaire_id: id, traitee_at: new Date().toISOString() }).eq("id", demande.id);
  } catch (e) {
    journal("demande en échec", demande.id, e.message);
    await db.from("enquete_demandes").update({ statut: "erreur", erreur: e.message, traitee_at: new Date().toISOString() }).eq("id", demande.id);
  }
}

// ---------------------------------------------------------------------------

const [mode, ...fichiers] = process.argv.slice(2);
if (mode === "hebdo") {
  await ecrireEtRanger("hebdo");
} else if (mode === "importer") {
  const existantes = new Set((await verif(db.from("enquete_affaires").select("titre").eq("regle", 2))).map((a) => a.titre));
  for (const f of fichiers) {
    const affaire = charger(f);
    if (existantes.has(affaire.titre)) {
      journal("déjà rangée", affaire.titre);
      continue;
    }
    journal("rangée", await ranger(affaire, "manuel"), affaire.titre);
  }
} else {
  const noms = await nomsJoueurs();
  await notificationsAssocies(noms);
  await notificationsBureaux(noms);
  await notificationsParties(noms);
  await demandes();
}
