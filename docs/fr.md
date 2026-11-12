# Parcs nationaux américains (NPS)

Suivez dans Gladys les **alertes, fermetures et événements** des parcs
nationaux américains qui vous intéressent (Yosemite, Yellowstone, Grand
Canyon…), grâce à l'API officielle du **National Park Service** (NPS).

> Sans lien avec le National Park Service. La pointe de flèche du NPS est un
> emblème protégé : cette intégration ne l'utilise pas.

## Ce que vous obtenez

- **Un appareil par parc**, avec :
  - le nombre d'alertes en cours dans chaque catégorie du NPS : **fermeture**,
    **danger**, **prudence**, **information** ;
  - **fermeture en cours** (oui / non) : une alerte « Park Closure » est
    publiée. Elle est souvent partielle (une route, un sentier, une zone),
    rarement le parc entier ;
  - un **niveau d'alerte** : 0 aucune alerte, 1 information, 2 prudence,
    3 danger ou fermeture ;
  - l'**alerte la plus grave**, en texte (« Fermeture : Tioga Road and Glacier
    Point Road will temporarily close… ») ;
  - le **prochain événement** du calendrier du parc (balades avec un ranger,
    soirées…), à l'heure locale du parc.
- Un **widget** de tableau de bord avec les alertes en cours, les plus graves
  d'abord.
- Un **déclencheur de scène** « Nouvelle alerte d'un parc », filtrable par parc
  et par catégorie.
- Une **action de scène** qui lit les alertes à voix haute ou les envoie par
  message.

Les titres des alertes et les noms des événements viennent du NPS, en anglais.

## Prérequis

- Gladys Assistant **5.3.0** ou plus récent.
- Un accès à Internet depuis Gladys.
- Facultatif mais conseillé : une **clé API** gratuite d'api.data.gov.

## Installation

1. Dans Gladys, allez dans **Intégrations → Installer depuis GitHub**.
2. Collez l'adresse du dépôt : `https://github.com/guim31/gladys-nps`.
3. Installez, puis ouvrez la page de configuration de l'intégration.

## Configuration

### Réglages

| Réglage                     | Rôle                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Clé API NPS                 | Votre clé gratuite. Vide : `DEMO_KEY`, partagée et limitée à quelques requêtes par heure.                        |
| Parcs nationaux             | Les 63 parcs nationaux.                                                                                          |
| Autres sites du NPS         | Codes d'autres sites du NPS (monuments, littoraux, sites historiques…), séparés par des virgules : `stli, alca`. |
| Rafraîchissement            | Toutes les 30 minutes, toutes les heures (par défaut) ou toutes les 2 heures.                                    |
| Langue des noms et messages | Noms des fonctionnalités (fixés à l'ajout du parc), textes, widget et phrases des scènes. Français par défaut.   |

**Obtenir une clé** : remplissez le formulaire de
[nps.gov/subjects/developer/get-started.htm](https://www.nps.gov/subjects/developer/get-started.htm)
(nom et e-mail) ; la clé arrive aussitôt par e-mail. Collez-la dans le champ
**Clé API NPS** et enregistrez.

**Le code d'un site** est la partie de son adresse nps.gov après le domaine :
`https://www.nps.gov/stli/` donne `stli` (statue de la Liberté).

### Ajouter des parcs

Enregistrez la configuration : chaque parc apparaît dans l'onglet
**Découverte** de l'intégration. Ajoutez à Gladys ceux qui vous intéressent. Un
parc retiré de la liste continue de fonctionner tant que son appareil existe
dans Gladys.

### Vérifier

Le bouton **État** de la page de configuration liste les parcs suivis, leur
nombre d'alertes, la dernière lecture et la dernière erreur. Une clé invalide
ou une limite horaire atteinte s'affiche aussi en haut de la page de
l'intégration.

## Appareils

| Fonctionnalité       | Type             | Valeurs                                                         |
| -------------------- | ---------------- | --------------------------------------------------------------- |
| Alertes fermeture    | compteur         | alertes « Park Closure » en cours                               |
| Alertes danger       | compteur         | alertes « Danger » en cours                                     |
| Alertes prudence     | compteur         | alertes « Caution » en cours                                    |
| Alertes information  | compteur         | alertes « Information » en cours                                |
| Fermeture en cours   | entrée (binaire) | 1 tant qu'une alerte de fermeture est publiée                   |
| Niveau d'alerte      | niveau de risque | 0 aucune, 1 information, 2 prudence, 3 danger/fermeture         |
| Alerte la plus grave | texte            | « Danger : <titre> », ou « Aucune alerte »                      |
| Prochain événement   | texte            | « sam. 14 nov., 18:30 · <titre> », ou « Aucun événement prévu » |

Les compteurs, la fermeture et le niveau gardent leur historique : un
graphique montre combien de temps une route est restée fermée. Utilisez-les
dans les scènes (« quand Alertes fermeture de Yosemite change », « quand Niveau
d'alerte vaut 3 »).

## Widget du tableau de bord

**Alertes des parcs** : les alertes en cours des parcs ajoutés à Gladys, les
plus graves d'abord (fermetures et dangers en rouge, prudence en orange,
information en bleu), 10 lignes au plus. Au-dessus, le nombre par parc ;
en dessous, un lien vers la page **Current conditions** du parc sur nps.gov
quand un seul parc est affiché.

Réglages : les parcs affichés (vide : tous), et des interrupteurs pour masquer
les alertes d'information, le nombre par parc et le lien.

## Déclencheurs de scène

**Nouvelle alerte d'un parc** : le NPS publie une alerte absente à la lecture
précédente, pour un parc ajouté à Gladys. Filtres : parcs (vide : n'importe
lequel) et catégories (fermeture, danger, prudence, information ; vide :
n'importe laquelle). Variables : nom du parc, catégorie, titre de l'alerte
(anglais), texte « catégorie : titre », lien vers l'alerte.

Les alertes déjà publiées à l'ajout d'un parc, ou au démarrage de
l'intégration, ne le déclenchent pas.

## Action de scène

**Lire les alertes des parcs** : les alertes en cours des parcs choisis (vide :
tous) en une phrase (« Zion National Park : 4 alertes. Fermeture : … »), plus
des nombres : nombre d'alertes, alertes fermeture, alertes danger, et la
catégorie la plus grave (`none`, `closure`, `danger`, `caution`,
`information`).

## Exemples de scènes

- **Voyage en vue** : déclencheur « Nouvelle alerte d'un parc », parc
  Yosemite, catégories fermeture et danger → envoyer le texte « catégorie :
  titre » et le lien par message.
- **Point du matin pendant le voyage** : chaque jour à 7 h → « Lire les alertes
  des parcs » → dire la phrase.
- **Surveiller une route** : quand « Alertes fermeture » de Yellowstone repasse
  à 0 → envoyer un message.

## Données et rafraîchissement

- Alertes : une requête groupée pour tous les parcs à chaque rafraîchissement.
- Événements : une requête (ou quelques pages de 50) toutes les 6 heures et à
  chaque nouveau jour, pour les 31 jours suivants.
- Noms des sites : une requête quand des sites sont saisis par code.
- api.data.gov autorise **1 000 requêtes par heure** avec une clé personnelle ;
  `DEMO_KEY` est partagée par tous les utilisateurs d'une même adresse et
  limitée à quelques requêtes par heure : assez pour un essai, pas pour un
  usage quotidien.
- Sur une clé invalide ou une limite atteinte, l'intégration le dit sur sa page,
  fait une pause après une limite (le temps demandé par l'API, deux heures au plus), et garde les dernières valeurs.

## Dépannage

- **« La clé de l'API NPS n'est pas valide »** : vérifiez la clé (sans espace),
  ou videz le champ pour essayer avec `DEMO_KEY`.
- **« Limite de requêtes de l'API NPS atteinte »** : prenez votre propre clé (voir
  plus haut).
- **Un site saisi n'apparaît pas** : le bouton **État** liste les codes que le
  NPS ne connaît pas ; vérifiez le code dans l'adresse nps.gov.
- **Logs** : dans Gladys, les logs du conteneur de l'intégration ; réglez
  `LOG_LEVEL=debug` pour une ligne par lecture.

## Limites

- Données du NPS : une alerte apparaît quand le parc la publie, parfois des
  heures après une fermeture. Vérifiez toujours nps.gov avant un voyage.
- « Fermeture en cours » signifie qu'une alerte de fermeture est publiée, pas
  que tout le parc est fermé.
- Les heures des événements sont données à l'heure locale du parc (fuseau de
  son État).
- L'état des routes n'est pas couvert : le NPS le donne dans le texte des
  alertes.
- Développée et testée contre la vraie API du NPS, mais sans recul d'usage :
  retours bienvenus sur le forum.

## Crédits

- Données : [API du National Park Service](https://www.nps.gov/subjects/developer/api-documentation.htm),
  domaine public (œuvre du gouvernement américain), via api.data.gov.
- Sans lien avec le National Park Service. L'emblème de la pointe de flèche du
  NPS n'est pas utilisé.
- Intégration par guim31, licence Apache 2.0.
