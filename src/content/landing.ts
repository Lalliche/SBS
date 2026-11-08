/* Landing + entry-page copy (all French). Placeholders are flagged `// PLACEHOLDER`. */
export const nav = {
  links: [
    { href: "#cycle", label: "Le cycle" },
    { href: "#anonymat", label: "Anonymat" },
    { href: "#profils", label: "Profils" },
    { href: "#competences", label: "Compétences" },
    { href: "#faq", label: "Questions" },
  ],
  cta: "Explorer la plateforme",
  aria: { primary: "Navigation principale", open: "Ouvrir le menu", close: "Fermer le menu", home: "SBS — Sovereign Business & Strategy, accueil" },
};

export const hero = {
  eyebrow: "SBS 360° · Talent & Performance",
  title: "Le feedback de mission, tout au long de l’année.",
  emphasis: ["tout", "l’année."],
  lead: "Recueillez les retours des personnes qui travaillent vraiment ensemble, mission après mission, puis transformez-les en une synthèse claire pour l’évaluation annuelle.",
  primary: "Explorer la plateforme",
  secondary: "Voir la visite guidée",
  proof: ["Six compétences SBS", "Aucun score global", "Anonymat sans exception"],
  card: {
    kicker: "Synthèse · cycle FY27",
    status: "Validée",
    name: "Lucas Bernard",
    role: "Principal · Strategy & Consulting",
    axes: ["Inspirer", "Développer", "Intégrité et inclusion", "Expertise et outils", "Engagements et livraison", "Orientation client"],
    current: [2.7, 3.5, 3.9, 4.7, 4.5, 3.8],
    archive: [2.9, 3.2, 3.8, 4.3, 4.2, 3.6],
    currentLabel: "Cycle FY27",
    archiveLabel: "Cycle FY26",
    received: "Feedbacks reçus",
    receivedValue: 9,
    missions: "sur 4 missions",
    strength: "Point fort",
    strengthValue: "Expertise et outils",
    axis: "Axe de développement",
    axisValue: "Inspirer",
    note: "Aucune note finale calculée.",
  },
  chips: [
    { id: "anon", label: "Feedback anonyme", sub: "Pair · Cartographie des risques" },
    { id: "named", label: "Nominatif", sub: "Responsable · Schéma directeur" },
    { id: "quota", label: "Objectif", sub: "3 / 5 feedbacks reçus" },
  ],
};

export const cycle = {
  id: "cycle",
  eyebrow: "Un cycle, quatre temps",
  title: "Une année claire, sans manipulation.",
  lead: "Du lancement à l’archivage, la plateforme suit le rythme de l’année et garde l’historique.",
  steps: [
    { n: "01", title: "Ouvrir le cycle", text: "L’administrateur RH ouvre l’année : dates de début et de fin, objectifs de feedback, règles de rappel." },
    { n: "02", title: "Échanger des feedbacks", text: "Chacun demande ou donne un feedback, avec son nom ou de façon anonyme, rattaché à une mission." },
    { n: "03", title: "Synthétiser", text: "Points forts, axes de développement et radar sur six compétences. Des moyennes simples, jamais de score global." },
    { n: "04", title: "Archiver", text: "À la date de fin, le cycle s’archive automatiquement. Le suivant démarre, l’historique reste consultable." },
  ],
  visual: {
    open: { title: "Cycle FY27", range: "1 juil. 2026 → 30 juin 2027", today: "Aujourd’hui", items: ["Objectifs : 5 feedbacks reçus", "Rappels hebdomadaires actifs", "14 missions"] },
    exchange: { question: "Engagements et livraison", prompt: "Comment cette personne a-t-elle tenu ses engagements en matière de délais, de budget et de qualité ?", answer: "Tous les jalons tenus, budget respecté. Anticipe les risques et alerte tôt, avec une solution proposée.", named: "Avec mon nom", anonymous: "Anonyme", send: "Envoyer le feedback" },
    synth: { title: "Synthèse", strengths: "Points forts", axes: "Axes de développement", s1: "Structure les problèmes complexes avec clarté.", a1: "Clarifier plus tôt la direction donnée à l’équipe." },
    archive: { cycles: [{ n: "FY28", s: "Ouvert" }, { n: "FY27", s: "Archivé" }, { n: "FY26", s: "Archivé" }] },
  },
};

export const anonymity = {
  id: "anonymat",
  eyebrow: "Anonymat",
  title: "L’anonymat n’est pas un réglage d’affichage. C’est une architecture.",
  lead: "Le feedback anonyme est écrit dans un espace séparé, par une fonction qui ne reçoit jamais l’identité de son auteur. Il n’y a rien à retrouver, même pour un administrateur.",
  guarantees: [
    { title: "Aucun auteur enregistré", text: "L’identité d’un feedback anonyme n’est stockée nulle part." },
    { title: "Personne ne peut le retrouver", text: "Ni le responsable, ni les RH, ni les administrateurs techniques." },
    { title: "Un message clair avant l’envoi", text: "L’envoi anonyme est définitif : il ne peut plus être modifié ni retiré." },
  ],
  lanes: {
    named: { label: "Feedback nominatif", from: "Auteur", to: "Destinataire", caption: "L’auteur est connu du destinataire et de son responsable." },
    anon: { label: "Feedback anonyme", from: "Auteur", to: "Destinataire", caption: "Le lien est rompu à l’écriture. Rien ne permet de le reconstituer.", store: "Espace anonyme" },
  },
  table: {
    stored: { title: "Ce qui est enregistré", items: ["Le destinataire", "La mission", "La date, arrondie au jour", "Les réponses et notes"] },
    notStored: { title: "Ce qui ne l’est pas", items: ["L’auteur", "La demande d’origine", "L’heure exacte d’envoi", "Tout lien vers une personne"] },
  },
};

export const profiles = {
  id: "profils",
  eyebrow: "Choisir un profil",
  title: "Entrez dans la plateforme avec le rôle de votre choix.",
  lead: "Quatre parcours, un même jeu de données. Changez de profil à tout moment depuis la barre de démonstration.",
  enter: "Entrer en tant que",
  tech: "Administrateur technique",
  cards: [
    { userId: "u-sophie", name: "Sophie Martin", job: "Directrice du Capital Humain", role: "Admin RH", caps: ["Ouvre les cycles et pilote la participation", "Crée les missions et les liens client", "Règle la visibilité et les rappels"] },
    { userId: "u-thomas", name: "Thomas Dubois", job: "Partner", role: "Responsable d’équipe", caps: ["Suit les feedbacks de son équipe", "Rédige la synthèse de chaque collaborateur", "S’appuie sur une proposition IA, à valider"] },
    { userId: "u-lucas", name: "Lucas Bernard", job: "Principal", role: "Collaborateur", caps: ["Demande un feedback après une mission", "Suit son objectif de feedbacks reçus", "Consulte ses feedbacks et sa synthèse"] },
    { userId: "u-claire", name: "Claire Moreau", job: "Consultante senior", role: "Collaboratrice qui donne des feedbacks", caps: ["Répond aux demandes de ses collègues", "Choisit : avec son nom ou anonyme", "Retrouve ses envois nominatifs"] },
  ],
};

export const competencies = {
  id: "competences",
  eyebrow: "Les six compétences",
  title: "Le référentiel de SBS, au cœur de chaque feedback.",
  lead: "Libellés et questions sont ceux de SBS. Ils restent modifiables à tout moment, sans développement.",
  hint: "Questions adaptées à la relation et au grade",
};

export const clientFeedback = {
  eyebrow: "Retour client",
  title: "Le point de vue du client, par un simple lien.",
  lead: "L’administrateur RH crée un lien rattaché à une mission. Le client répond depuis son téléphone, sans créer de compte. Partage par e-mail ou par QR code.",
  points: ["Date d’expiration et nombre de réponses maximal", "Activation et désactivation à tout moment", "Réponses rattachées à la mission"],
  phone: { title: "Votre avis sur notre accompagnement", welcome: "Merci de prendre quelques minutes pour partager votre retour.", q: "Comment jugez-vous la qualité des livrables remis ?", send: "Envoyer mes réponses" },
};

export const facts = {
  eyebrow: "En chiffres",
  title: "Simple à donner. Utile à lire.",
  items: [
    { value: 6, suffix: "", label: "compétences SBS", sub: "libellés modifiables" },
    { value: 7, suffix: "", label: "questions écrites", sub: "de 5 à 8, réponses libres" },
    { value: 5, suffix: "", label: "notes possibles", sub: "de 1 à 5, facultatives" },
    { value: 0, suffix: "", label: "score global", sub: "des moyennes simples seulement" },
  ],
};

export const guarantees = {
  eyebrow: "Vos garanties",
  items: [
    { title: "Anonymat réel", text: "Aucun auteur stocké pour un feedback anonyme. La garantie vaut dans les écrans, les exports et les journaux." },
    { title: "Accès par rôle", text: "Chaque personne ne voit que ce que son profil autorise. Les règles de visibilité sont paramétrables." },
    { title: "Aucune note finale calculée", text: "La synthèse accompagne l’évaluation annuelle. La décision reste celle du responsable, dans l’outil actuel de SBS." },
  ],
};

export const faq = {
  id: "faq",
  eyebrow: "Questions fréquentes",
  title: "Ce que l’on nous demande le plus souvent.",
  items: [
    { q: "Qu’est-ce qu’un feedback anonyme ?", a: "Un feedback dont l’auteur n’est enregistré nulle part. Il est stocké dans un espace séparé, sans lien avec la personne qui l’a écrit. Une fois envoyé, il ne peut plus être modifié ni retiré." },
    { q: "Qui peut voir mon feedback ?", a: "Le destinataire et son responsable d’équipe, selon les règles de visibilité définies avec SBS. Pour un feedback nominatif, votre nom est visible ; pour un feedback anonyme, jamais." },
    { q: "Pourquoi la note est-elle facultative ?", a: "Parce que les réponses écrites passent en premier. La note de 1 à 5 est proposée après, comme résumé complémentaire. Elle n’est jamais obligatoire par défaut." },
    { q: "Comment est calculée une moyenne ?", a: "Par compétence, en additionnant les notes données puis en divisant par leur nombre. Une note absente n’est pas un zéro. Aucune pondération, aucun score global." },
    { q: "La plateforme remplace-t-elle l’évaluation annuelle ?", a: "Non. Elle recueille des feedbacks et prépare une synthèse. La note finale reste décidée par le responsable, dans l’outil actuel de SBS." },
  ],
};

export const finalCta = {
  title: "Voyez l’année d’une équipe, en deux minutes.",
  lead: "Parcourez les écrans de chaque profil, avancez le temps jusqu’à l’archivage du cycle, et mettez-vous à la place d’un client.",
  primary: "Explorer la plateforme",
  secondary: "Voir la visite guidée",
};

export const footer = {
  note: "Démonstration préparée par SOLRUS pour SBS. Données fictives.",
  links: [
    { label: "Site SBS", href: "https://www.sbsfirm.org" },
    { label: "Administrateur technique", href: "#tech" },
  ],
  legal: "SOLRUS — Solutions logicielles sur mesure",
};
