/* Formulaire « Être rappelé » de la page Contact.

   Deux chemins, dans cet ordre :

   1. L'API du cabinet, quand son adresse est renseignée ci-dessous. La
      demande arrive alors directement dans le panneau, où la coordination
      la voit sans que personne ait à surveiller un téléphone.
   2. WhatsApp, sinon — et aussi dès que l'envoi échoue. Le réseau coupe
      souvent à Bamako : une demande perdue est une famille qui rappelle,
      ou qui ne rappelle pas. Le message part pré-rempli, rien n'est resaisi.

   Tant que l'API n'est pas en ligne, laissez API vide : le formulaire
   fonctionne déjà, par WhatsApp. */

const API = ''; // ex. 'https://api.alshifa.ml/api'
const WHATSAPP = '22391370415';

const form = document.getElementById('demande-contact');
const statut = form.querySelector('.form-statut');
const bouton = form.querySelector('button[type="submit"]');

/** Un numéro malien : 8 chiffres, avec ou sans indicatif, espaces libres. */
function telephoneValide(saisie) {
  const chiffres = saisie.replace(/[^\d]/g, '');

  return /^(223)?\d{8}$/.test(chiffres);
}

function dire(message, erreur = false) {
  statut.textContent = message;
  statut.classList.toggle('form-statut-erreur', erreur);
}

/** Reprend la saisie dans un message WhatsApp, pour ne rien faire retaper. */
function versWhatsApp(donnees) {
  const lignes = [
    `Bonjour, je suis ${donnees.nom}.`,
    `Soin souhaité : ${donnees.service_souhaite}.`,
    donnees.message ? `Précisions : ${donnees.message}` : null,
    `Mon numéro : ${donnees.telephone}`,
  ].filter(Boolean);

  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lignes.join('\n'))}`, '_blank', 'noopener');
}

form.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();

  const donnees = {
    nom: form.nom.value.trim(),
    telephone: form.telephone.value.trim(),
    service_souhaite: form.service_souhaite.value,
    message: form.message.value.trim(),
  };

  if (!donnees.nom || !donnees.telephone || !donnees.service_souhaite) {
    dire('Merci d’indiquer votre nom, votre téléphone et le soin souhaité.', true);

    return;
  }

  if (!telephoneValide(donnees.telephone)) {
    dire('Ce numéro ne semble pas complet : huit chiffres, par exemple 76 00 00 00.', true);

    return;
  }

  // Un robot remplit tous les champs, y compris celui que personne ne voit.
  // On le laisse croire que c'est parti.
  if (form.site_web.value) {
    dire('Votre demande a bien été reçue.');

    return;
  }

  if (!API) {
    versWhatsApp(donnees);
    dire('WhatsApp s’ouvre avec votre demande : il ne reste qu’à l’envoyer.');

    return;
  }

  bouton.disabled = true;
  dire('Envoi en cours…');

  try {
    const reponse = await fetch(`${API}/public/demande-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(donnees),
    });

    if (!reponse.ok) {
      throw new Error(`HTTP ${reponse.status}`);
    }

    const corps = await reponse.json();
    form.reset();
    dire(corps.message || 'Votre demande a bien été reçue. Nous vous contacterons très rapidement.');
  } catch (_) {
    // Coupure réseau ou serveur indisponible : la demande passe par WhatsApp
    // plutôt que de disparaître.
    versWhatsApp(donnees);
    dire('La connexion n’a pas abouti : votre demande part par WhatsApp, il ne reste qu’à l’envoyer.', true);
  } finally {
    bouton.disabled = false;
  }
});
