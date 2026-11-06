import { useEffect, useState } from "react";
import { dessinerCarte, partagerCarte, verdict, type DonneesCarte } from "../lib/carte";

// Plein écran : la une prête à partager. L'image est dessinée à l'ouverture,
// pour que le bouton lance le partage du téléphone sans attendre (iPhone
// exige que le partage parte directement du toucher).
export function PartageUne({ donnees, onFermer }: { donnees: DonneesCarte; onFermer: () => void }) {
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let url = "";
    dessinerCarte(donnees)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
      })
      .catch(() => setMessage("La une n'a pas pu être imprimée."));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [donnees]);

  async function partager() {
    if (!image) return;
    const r = await partagerCarte(image.blob, donnees);
    if (r === "telecharge") setMessage("Image enregistrée dans tes téléchargements.");
  }

  return (
    <div className="partage-une" role="dialog" aria-modal="true" aria-label="Partager ma une">
      <div className="partage-haut">
        <span className="etiquette">Ta une, sans rien dévoiler</span>
        <button className="lien-retour" onClick={onFermer}>FERMER</button>
      </div>
      <div className="partage-image">
        {image ? <img src={image.url} alt={`Une : ${donnees.titre}, ${verdict(donnees).toLowerCase()}`} /> : <span className="reflet" style={{ width: "100%", aspectRatio: "4 / 5" }} />}
      </div>
      {message && <p className="petit" style={{ margin: 0, textAlign: "center", color: "var(--gris-clair)" }}>{message}</p>}
      <button className="gros-bouton papier-fond" onClick={partager} disabled={!image}>PARTAGER MA UNE</button>
    </div>
  );
}
