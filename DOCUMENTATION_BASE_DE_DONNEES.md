# Documentation de la base de données — `crud_nest`

## Vue d'ensemble

La base de données supporte une application de **gestion de budget personnel**.
Elle permet à un utilisateur de suivre ses dépenses, revenus, catégories, enveloppes budgétaires, tickets de caisse et tâches.

---

## Schéma des relations

```
user ──────────────────────────────────────────────────────────────┐
 │                                                                  │
 ├── OneToMany ──▶ revenue         (revenus de l'utilisateur)       │
 │                                                                  │
 ├── OneToMany ──▶ envelope        (enveloppes budgétaires)         │
 │                    └── OneToMany ──▶ transaction                 │
 │                                                                  │
 ├── OneToMany ──▶ tickets         (tickets de caisse scannés)      │
 │                                                                  │
 ├── [via action] ──▶ action       (dépenses enregistrées)          │
 │                    ├── ManyToOne ──▶ categorie                   │
 │                    └── ManyToOne ──▶ tickets (optionnel)         │
 │                                                                  │
 ├── [via categorie] ──▶ categorie (catégories de dépenses)         │
 │                        └── OneToOne ──▶ category_image           │
 │                                                                  │
 ├── [via ticket_expense] ──▶ ticket_expense (liaison ticket/action)│
 │                                                                  │
 └── [via todo] ──▶ todo           (tâches / rappels)              ─┘
```

---

## Tables

### `user` — Utilisateurs

Contient les comptes utilisateurs. Supporte la connexion classique (email + mot de passe) et Google OAuth.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | int | PK, auto-increment | Identifiant unique |
| email | varchar | UNIQUE, NOT NULL | Adresse email |
| nom | varchar | NOT NULL | Nom de famille |
| prenom | varchar | NOT NULL | Prénom |
| password | varchar | nullable | Mot de passe hashé (null si connexion Google) |
| googleId | varchar | UNIQUE, nullable | Identifiant Google OAuth |
| isEmailVerified | boolean | default: false | Email confirmé ou non |
| emailVerificationToken | varchar | nullable | Token de vérification email |
| resetPasswordToken | varchar | nullable | Token de réinitialisation mot de passe |
| resetPasswordExpire | datetime | nullable | Date d'expiration du token reset |
| profilePicture | varchar | nullable | Chemin ou URL de la photo de profil |
| phoneNumber | varchar | nullable | Numéro de téléphone |
| dateOfBirth | date | nullable | Date de naissance |
| address | varchar | nullable | Adresse postale |

---

### `action` — Dépenses

Enregistre chaque dépense effectuée par un utilisateur, rattachée à une catégorie.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | int | PK, auto-increment | Identifiant unique |
| description | varchar | NOT NULL | Libellé de la dépense |
| montant | decimal(10,2) | default: 0.00 | Montant de la dépense |
| dateAjout | datetime | default: NOW() | Date d'enregistrement |
| dateTransaction | datetime | nullable | Date réelle de la transaction |
| categorieId | int | FK → categorie (CASCADE) | Catégorie associée |
| userId | int | FK → user | Utilisateur propriétaire |
| ticketId | int | FK → tickets (SET NULL), nullable | Ticket de caisse lié (optionnel) |

---

### `categorie` — Catégories de dépenses

Permet à l'utilisateur d'organiser ses dépenses par catégorie avec un budget mensuel.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | int | PK, auto-increment | Identifiant unique |
| categorie | varchar | NOT NULL | Nom de la catégorie |
| color | varchar | NOT NULL | Couleur associée (hex ou nom) |
| budgetDebutMois | int | NOT NULL | Budget alloué en début de mois |
| month | text (enum Month) | NOT NULL | Mois concerné |
| annee | int | NOT NULL | Année concernée |
| userId | int | FK → user (CASCADE) | Utilisateur propriétaire |
| categorieId | int | FK → category_image (JoinColumn) | Image/icône associée |

---

### `category_image` — Images des catégories

Stocke l'icône associée à chaque catégorie.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | int | PK, auto-increment | Identifiant unique |
| iconName | varchar | NOT NULL | Nom de l'icône |
| categorieId | int | FK → categorie (OneToOne) | Catégorie associée |

---

### `envelope` — Enveloppes budgétaires

Système d'enveloppes : l'utilisateur alloue un montant par enveloppe pour un mois/année donné.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | uuid | PK | Identifiant unique |
| name | varchar | NOT NULL | Nom de l'enveloppe |
| month | int | NOT NULL | Mois (1-12) |
| year | int | NOT NULL | Année |
| amount | decimal(10,2) | default: 0 | Montant alloué |
| icone | varchar | default: '' | Icône de l'enveloppe |
| userId | int | FK → user | Utilisateur propriétaire |

---

### `transaction` — Transactions d'enveloppe

Chaque débit ou crédit sur une enveloppe budgétaire.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | uuid | PK | Identifiant unique |
| description | varchar | NOT NULL | Libellé |
| amount | decimal(10,2) | NOT NULL | Montant |
| date | date | NOT NULL | Date de la transaction |
| envelopeId | uuid | FK → envelope (CASCADE) | Enveloppe concernée |

---

### `revenue` — Revenus

Revenus déclarés par l'utilisateur (salaire, autres entrées d'argent).

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | int | PK, auto-increment | Identifiant unique |
| name | varchar | NOT NULL | Libellé du revenu |
| amount | int | NOT NULL | Montant |
| date | date | NOT NULL | Date du revenu |
| userId | int | FK → user (CASCADE) | Utilisateur propriétaire |

---

### `tickets` — Tickets de caisse

Tickets de caisse scannés et analysés par OCR.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | int | PK, auto-increment | Identifiant unique |
| texte | text | NOT NULL | Texte brut extrait par OCR |
| dateAjout | datetime | auto (CreateDate) | Date d'ajout du ticket |
| totalExtrait | decimal(10,2) | nullable | Total détecté automatiquement |
| sousTotal | decimal(10,2) | nullable | Sous-total détecté |
| tva | decimal(10,2) | nullable | TVA détectée |
| dateTicket | varchar | nullable | Date sur le ticket |
| commercant | varchar | nullable | Nom du commerçant |
| articlesJson | text | nullable | Liste des articles (JSON sérialisé) |
| confianceOCR | decimal(5,2) | nullable | Taux de confiance de la lecture OCR |
| imagePath | varchar | nullable | Chemin vers l'image du ticket |
| userId | int | FK → user (CASCADE) | Utilisateur propriétaire |

> Les articles sont stockés en JSON sous forme de texte : `[{ name, price, quantity }]`

---

### `ticket_expense` — Liaison ticket / dépense

Table de jointure qui associe un ticket de caisse à une dépense (`action`), avec les données extraites.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | int | PK, auto-increment | Identifiant unique |
| ticket_id | int | NOT NULL | Référence au ticket |
| created_at | datetime | auto (CreateDate) | Date de création |
| extractedData | json | nullable | Données structurées extraites du ticket |
| expenseId | int | FK → action (CASCADE), UNIQUE | Dépense associée (unique) |
| userId | int | FK → user (CASCADE) | Utilisateur propriétaire |

---

### `todo` — Tâches / Rappels

Liste de tâches personnelles de l'utilisateur.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | int | PK, auto-increment | Identifiant unique |
| title | varchar | NOT NULL | Titre de la tâche |
| description | varchar | NOT NULL | Détail de la tâche |
| createdAt | timestamp | auto | Date de création |
| updatedAt | timestamp | auto | Date de dernière modification |
| userId | int | FK → user | Utilisateur propriétaire |

---

## Règles de suppression (CASCADE)

| Table supprimée | Effet |
|---|---|
| `user` | Supprime ses `revenue`, `envelope`, `tickets` (cascade) |
| `envelope` | Supprime ses `transaction` |
| `categorie` | Supprime ses `action` |
| `action` | Supprime ses `ticket_expense` |
| `user` (via ticket_expense) | Supprime les `ticket_expense` associés |
| `tickets` (via action) | Met `ticketId` à NULL dans `action` (SET NULL) |

---

## Énumération `Month`

Utilisée dans la table `categorie` pour le champ `month` :

```
JANUARY, FEBRUARY, MARCH, APRIL, MAY, JUNE,
JULY, AUGUST, SEPTEMBER, OCTOBER, NOVEMBER, DECEMBER
```
