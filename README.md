# Budget API

API REST de gestion de budget personnel, construite avec **NestJS** et **TypeORM**. Elle gère les enveloppes budgétaires, les dépenses, les revenus, les transactions et la numérisation de tickets de caisse par OCR.

## Fonctionnalités

- **Enveloppes budgétaires** — création et suivi de budgets mensuels par catégorie (logement, courses, loisirs…)
- **Dépenses** — enregistrement et consultation des dépenses avec génération de rapports PDF
- **Revenus** — suivi des revenus par utilisateur
- **Transactions** — historique complet des mouvements financiers
- **Tickets de caisse OCR** — upload d'une photo de ticket, extraction automatique du montant, de la date, du marchand et des articles via Tesseract.js
- **Catégories** — gestion des catégories avec icônes personnalisées
- **Profil utilisateur** — gestion du compte et des préférences
- **Authentification JWT** — sécurisation de toutes les routes avec tokens JWT
- **Google OAuth** — connexion via compte Google
- **Administration** — tableau de bord admin avec gestion des utilisateurs
- **Export Excel** — export des données budgétaires au format Excel
- **Swagger** — documentation interactive de l'API (environnement de développement)

## Stack technique

| Technologie | Rôle |
|---|---|
| NestJS 11 | Framework principal |
| TypeORM | ORM base de données |
| MySQL 8 | Base de données |
| JWT | Authentification |
| Tesseract.js | OCR pour les tickets |
| Sharp | Traitement d'images |
| PDFKit | Génération de PDF |
| Multer | Upload de fichiers |
| Swagger | Documentation API |
| Docker | Containerisation |

## Prérequis

- Node.js >= 18
- MySQL 8
- npm

## Installation

```bash
npm install
```

## Configuration

Créer un fichier `.env` à la racine :

```env
PORT=3010
NODE_ENV=development

# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_USER=nestuser
DB_PASSWORD=REMOVED_FROM_HISTORY
DB_NAME=crud_nest

# JWT
secret=votre_secret_jwt

# CORS
CORS_ORIGIN=http://localhost:5173
```

## Lancement

```bash
# Développement avec rechargement automatique
npm run start:dev

# Production
npm run start:prod
```

L'API est disponible sur `http://localhost:3010`.
La documentation Swagger est accessible sur `http://localhost:3010/api` (hors production).

## Docker

```bash
# Lancer l'API et la base de données
docker-compose up -d
```

## Tests

```bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:cov

# Tests e2e
npm run test:e2e
```

## Modules

| Module | Endpoint | Description |
|---|---|---|
| Auth | `/connection` | Inscription, connexion JWT, Google OAuth |
| Envelopes | `/envelopes` | Gestion des enveloppes budgétaires |
| Spend | `/spend` | Dépenses, export PDF |
| Revenue | `/revenue` | Revenus |
| Transactions | `/transactions` | Historique des transactions |
| Ticket | `/ticket` | Upload et OCR de tickets de caisse |
| Categorie | `/categorie` | Catégories de budget |
| Profile | `/profile` | Profil utilisateur |
| Admin | `/admin` | Administration |
| Todos | `/todos` | Tâches associées au budget |

## Auteur

**lion92** — [krisscode.fr](https://krisscode.fr)
