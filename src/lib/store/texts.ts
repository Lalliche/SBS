/* French text banks used by the deterministic seed and the AI-draft simulator.
   Answers are written subject-less or in the giver's voice so no gender is implied. */
import type { GradeBand, Relation } from "./types";

export const COMPETENCIES = [
  { id: "c-inspirer", name: "Inspirer", description: "La confiance et l’énergie positive créées, y compris sous pression. La direction donnée et la progression des autres." },
  { id: "c-developper", name: "Développer", description: "La recherche de feedback, l’apprentissage et le partage de ce que l’on apprend." },
  { id: "c-integrite", name: "Intégrité et inclusion", description: "L’intégrité, la qualité du travail, le respect des valeurs de l’organisation et l’inclusion." },
  { id: "c-expertise", name: "Expertise et outils", description: "La capacité à structurer des problèmes complexes et à formuler des recommandations claires. L’usage responsable des outils, des données et de l’IA." },
  { id: "c-engagements", name: "Engagements et livraison", description: "Le respect des délais, du budget et de la qualité." },
  { id: "c-client", name: "Orientation client", description: "La compréhension des besoins du client, le conseil et la contribution au développement de l’organisation." },
] as const;

type Bank = { strong: string[]; mid: string[]; weak: string[] };

export const ANSWER_BANK: Record<string, Bank> = {
  "c-inspirer": {
    strong: [
      "Une énergie positive constante tout au long de la mission, même pendant les semaines les plus tendues : l’équipe s’en est nettement ressentie.",
      "Direction claire dès le lancement. Chacun savait ce qu’on attendait de lui et pourquoi, ce qui a créé un vrai climat de confiance.",
      "A pris le temps de faire progresser les plus juniors, avec des retours concrets et bienveillants après chaque livrable.",
      "Sous pression, reste calme et pose les priorités sans dramatiser. Cela rassure l’équipe comme le client.",
      "Donne envie de s’investir : les points d’étape redonnent du sens et de l’élan au groupe.",
    ],
    mid: [
      "Présence rassurante dans l’ensemble, avec une direction globalement claire. Les moments de forte charge ont parfois été moins bien cadrés.",
      "Bon climat dans l’équipe. J’aimerais voir plus souvent une prise de position nette lors des arbitrages.",
      "Sait motiver quand le contexte est favorable ; l’énergie retombe un peu quand les délais se resserrent.",
    ],
    weak: [
      "La direction donnée reste parfois floue. Poser plus tôt les priorités éviterait que l’équipe avance dans plusieurs sens.",
      "Pourrait partager davantage sa vision et valoriser les progrès des autres, notamment en comité de pilotage.",
      "Sous pression, le ton se durcit et l’énergie du groupe baisse. Un cadrage plus posé aiderait.",
      "J’aurais apprécié plus de temps consacré à faire progresser les membres les plus juniors de l’équipe.",
    ],
  },
  "c-developper": {
    strong: [
      "Demande spontanément du retour après chaque jalon et l’applique dès la semaine suivante. C’est visible dans la qualité des livrables.",
      "A partagé ses apprentissages avec l’équipe via un court retour d’expérience en fin de mission, très utile pour la suite.",
      "Curiosité réelle : monte rapidement en compétence sur les sujets nouveaux et en fait profiter les autres.",
      "Accueille les remarques sans se défendre et en tire des actions concrètes.",
    ],
    mid: [
      "Réceptif au feedback quand il est donné ; gagnerait à le solliciter plus tôt plutôt que d’attendre la fin de mission.",
      "Progrès nets depuis le début du cycle, mais encore peu de partage des apprentissages avec le reste de l’équipe.",
    ],
    weak: [
      "Le retour d’expérience est rarement sollicité. Intégrer un point feedback à mi-parcours serait un vrai plus.",
      "Les mêmes points reviennent d’une mission à l’autre ; il manque un temps pour capitaliser sur ce qui a été appris.",
      "Peu de partage de connaissances avec les pairs. Une courte restitution interne aiderait.",
    ],
  },
  "c-integrite": {
    strong: [
      "Rigueur exemplaire sur la qualité du travail et sur la confidentialité des informations du client. On peut s’appuyer dessus sans relire.",
      "Veille à ce que chacun puisse s’exprimer en réunion, y compris les profils les moins expérimentés. Environnement très inclusif.",
      "Cohérence entre les valeurs affichées et les actes, notamment quand il a fallu annoncer une mauvaise nouvelle au client.",
      "Transparence sur les difficultés rencontrées, sans attendre qu’elles deviennent des problèmes.",
    ],
    mid: [
      "Comportement irréprochable dans l’ensemble ; la qualité du travail est solide mais gagnerait à être davantage relue avant envoi.",
      "Respect des valeurs de la maison, avec une attention à l’inclusion à renforcer lors des échanges en comité élargi.",
    ],
    weak: [
      "Quelques livrables partis avec des coquilles ou des chiffres non recoupés. Un temps de relecture systématique est à instaurer.",
      "L’inclusion des collègues en début de carrière peut progresser : leur donner plus tôt la parole en réunion.",
    ],
  },
  "c-expertise": {
    strong: [
      "Structure des problèmes complexes avec une grande clarté : les recommandations sont argumentées, chiffrées et directement actionnables.",
      "Maîtrise remarquable des outils d’analyse et des données ; l’usage de l’IA reste raisonné, vérifié et toujours cité.",
      "A transformé un cadrage confus en plan de travail limpide en deux jours. Référence technique de la mission.",
      "Les modèles construits sont robustes et documentés, ce qui a permis à l’équipe de les reprendre sans difficulté.",
    ],
    mid: [
      "Bonne expertise, des recommandations claires. Quelques hypothèses auraient mérité d’être mieux explicitées au client.",
      "Maîtrise correcte des outils ; l’appropriation des nouvelles pratiques de traitement des données est en cours.",
    ],
    weak: [
      "Les recommandations manquent parfois d’arguments chiffrés. S’appuyer davantage sur les données renforcerait leur portée.",
      "L’usage des outils reste en deçà du besoin : une montée en compétence sur l’analyse de données serait bénéfique.",
    ],
  },
  "c-engagements": {
    strong: [
      "Tous les jalons tenus, budget respecté et qualité au rendez-vous, sans surcharge pour l’équipe. Une fiabilité remarquable.",
      "Anticipe les risques de retard et alerte tôt, avec une solution proposée. Très appréciable pour piloter la mission.",
      "Livrables rendus avec une longueur d’avance et un niveau de finition qui a été salué par le client.",
      "Gestion maîtrisée de la charge : le budget de la mission a été tenu malgré un périmètre qui a évolué.",
    ],
    mid: [
      "Délais généralement tenus. Deux livrables ont glissé de quelques jours sans que l’alerte soit remontée assez tôt.",
      "Qualité constante ; le suivi du budget pourrait être plus régulier pour éviter les ajustements de dernière minute.",
    ],
    weak: [
      "Des retards répétés sur les livrables intermédiaires. Un point hebdomadaire sur l’avancement aiderait à les anticiper.",
      "Le suivi du budget a manqué de visibilité : plusieurs écarts ont été découverts tardivement.",
    ],
  },
  "c-client": {
    strong: [
      "Comprend très vite les enjeux du client et reformule le besoin avec justesse. Le client l’a d’ailleurs sollicité directement pour la suite.",
      "Conseil franc et utile, adapté au contexte du client. Contribue aussi au développement de la maison en partageant des pistes d’offres.",
      "Entretient une vraie relation de confiance avec les interlocuteurs côté client, jusqu’au niveau direction.",
      "A su faire évoluer le périmètre avec le client en restant aligné sur ses priorités métiers.",
    ],
    mid: [
      "Bonne écoute du client ; le conseil pourrait aller plus loin sur les options alternatives à présenter.",
      "Relation client de qualité, avec une contribution au développement commercial encore discrète.",
    ],
    weak: [
      "Le besoin du client est parfois reformulé trop tard. Prévoir un point de cadrage plus tôt éviterait des allers-retours.",
      "Peu d’initiatives de conseil en dehors du périmètre. Proposer plus de pistes serait un vrai atout.",
    ],
  },
};

export const FREE_COMMENTS = [
  "Un plaisir de travailler ensemble sur cette mission. Merci pour la disponibilité et l’esprit d’équipe.",
  "Continuer ainsi. Un focus supplémentaire sur la prise de recul stratégique serait un bon objectif pour la suite.",
  "Très bonne collaboration. À reconduire sur une prochaine mission en binôme.",
  "Une contribution décisive à la réussite de la mission, particulièrement dans les deux dernières semaines.",
  "Rien à ajouter, si ce n’est de partager plus largement la méthode utilisée : elle mérite d’être capitalisée.",
  "Belle progression depuis le début du cycle. Les efforts sont visibles et appréciés.",
];

/* Question wording per competency, relation and band (spec 7.3: generated consistently). */
const BASE: Record<string, Record<Relation, string>> = {
  "c-inspirer": {
    RESPONSABLE: "En tant que responsable, comment cette personne a-t-elle créé de la confiance et de l’énergie positive dans la mission, y compris sous pression ? Comment a-t-elle fait progresser les autres ?",
    PAIR: "En travaillant à ses côtés, comment cette personne a-t-elle créé de la confiance et de l’énergie positive, y compris sous pression ? A-t-elle aidé les autres à progresser ?",
    EQUIPE: "Comment cette personne, en tant que responsable, vous a-t-elle donné une direction claire, de la confiance et de l’énergie, y compris sous pression ? Vous a-t-elle aidé à progresser ?",
  },
  "c-developper": {
    RESPONSABLE: "Comment cette personne recherche-t-elle et utilise-t-elle le feedback, apprend-elle et partage-t-elle ce qu’elle apprend ?",
    PAIR: "Comment cette personne recherche-t-elle le feedback auprès de ses collègues et partage-t-elle ce qu’elle apprend ?",
    EQUIPE: "Comment cette personne, en tant que responsable, cherche-t-elle votre feedback, apprend-elle et partage-t-elle avec l’équipe ?",
  },
  "c-integrite": {
    RESPONSABLE: "Comment cette personne a-t-elle fait preuve d’intégrité, de qualité dans son travail, de respect des valeurs de SBS et d’inclusion ?",
    PAIR: "Dans votre collaboration, comment cette personne a-t-elle illustré l’intégrité, la qualité du travail, les valeurs de SBS et l’inclusion ?",
    EQUIPE: "Comment cette personne montre-t-elle l’exemple en matière d’intégrité, de qualité, de valeurs de SBS et d’inclusion au sein de l’équipe ?",
  },
  "c-expertise": {
    RESPONSABLE: "Comment cette personne structure-t-elle les problèmes complexes et formule-t-elle des recommandations argumentées ? Comment utilise-t-elle les outils, les données et l’IA de façon responsable ?",
    PAIR: "Comment cette personne a-t-elle structuré les problèmes complexes et appuyé ses recommandations ? Qu’en est-il de son usage des outils, des données et de l’IA ?",
    EQUIPE: "Comment cette personne vous aide-t-elle à structurer les problèmes complexes et à formuler des recommandations claires ? Quel usage responsable des outils, données et IA transmet-elle ?",
  },
  "c-engagements": {
    RESPONSABLE: "Comment cette personne a-t-elle tenu ses engagements en matière de délais, de budget et de qualité ?",
    PAIR: "Sur cette mission, comment cette personne a-t-elle respecté délais, budget et qualité vis-à-vis de l’équipe ?",
    EQUIPE: "Comment cette personne, en tant que responsable, a-t-elle tenu les délais, le budget et le niveau de qualité attendus ?",
  },
  "c-client": {
    RESPONSABLE: "Comment cette personne a-t-elle compris les besoins du client, conseillé celui-ci et contribué au développement de l’organisation ?",
    PAIR: "Comment cette personne a-t-elle pris en compte les besoins du client, apporté du conseil et contribué à l’organisation ?",
    EQUIPE: "Comment cette personne a-t-elle porté la relation client et le conseil, et vous a-t-elle impliqué dans le développement de l’organisation ?",
  },
  comment: {
    RESPONSABLE: "Souhaitez-vous ajouter un commentaire libre sur sa contribution à cette mission ?",
    PAIR: "Souhaitez-vous ajouter un commentaire libre sur votre collaboration ?",
    EQUIPE: "Souhaitez-vous ajouter un commentaire libre sur son rôle de responsable ?",
  },
};

const BAND_HINT: Record<GradeBand, string> = {
  JUNIOR: " Appuyez-vous sur un exemple simple observé en mission.",
  CONFIRME: " Citez une situation précise et son effet sur le résultat.",
  SENIOR: " Prenez du recul : portée de l’action sur l’équipe, le client et l’organisation.",
};

export function buildVariants(key: string): Record<Relation, Record<GradeBand, string>> {
  const out = {} as Record<Relation, Record<GradeBand, string>>;
  for (const r of ["RESPONSABLE", "PAIR", "EQUIPE"] as Relation[]) {
    out[r] = {} as Record<GradeBand, string>;
    for (const b of ["JUNIOR", "CONFIRME", "SENIOR"] as GradeBand[]) {
      out[r][b] = key === "comment" ? BASE.comment[r] : BASE[key][r] + BAND_HINT[b];
    }
  }
  return out;
}

export const CLIENT_QUESTIONS = [
  { id: "qc-1", text: "Dans quelle mesure êtes-vous satisfait de l’accompagnement de SBS sur cette mission ?" },
  { id: "qc-2", text: "Comment jugez-vous la qualité des livrables remis ?" },
  { id: "qc-3", text: "Comment évaluez-vous la qualité de la communication avec l’équipe SBS ?" },
  { id: "qc-4", text: "Souhaitez-vous ajouter un commentaire libre ?" },
];

export const CLIENT_COMMENTS = [
  "Équipe réactive et très à l’écoute. Les recommandations ont été directement exploitables par nos directions métiers.",
  "Bonne qualité de livrables. Nous aurions apprécié un point d’avancement supplémentaire en milieu de mission.",
  "Accompagnement sérieux et structuré. Nous reviendrons vers SBS pour la phase suivante.",
  "Communication fluide, disponibilité remarquable des consultants tout au long de la mission.",
];

/* Synthesis writing helpers */
export const STRENGTH_TEXT: Record<string, string[]> = {
  "c-inspirer": ["Crée un climat de confiance et d’énergie positive qui est souligné par plusieurs collègues, y compris sous forte pression."],
  "c-developper": ["Sollicite régulièrement du feedback et partage ce qu’il apprend avec l’équipe."],
  "c-integrite": ["Rigueur sur la qualité du travail et attention constante à l’inclusion de chacun."],
  "c-expertise": ["Structure les problèmes complexes avec clarté et formule des recommandations argumentées et actionnables."],
  "c-engagements": ["Fiable sur les délais, le budget et la qualité ; anticipe et alerte avant que les risques ne se matérialisent."],
  "c-client": ["Comprend vite les enjeux du client et construit une relation de confiance durable."],
};
export const AXIS_TEXT: Record<string, string[]> = {
  "c-inspirer": ["Clarifier plus tôt la direction donnée et consacrer plus de temps à faire progresser les profils juniors."],
  "c-developper": ["Solliciter le feedback plus tôt dans la mission et capitaliser par un court retour d’expérience."],
  "c-integrite": ["Instaurer un temps de relecture systématique et encourager la prise de parole de chacun en comité."],
  "c-expertise": ["Renforcer l’appui des recommandations sur des données chiffrées et poursuivre la montée en compétence sur les outils d’analyse."],
  "c-engagements": ["Rendre le suivi du budget et des jalons plus visible, avec une alerte précoce en cas de glissement."],
  "c-client": ["Cadrer le besoin plus tôt avec le client et proposer davantage d’options alternatives."],
};
