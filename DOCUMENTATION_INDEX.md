# 📚 Index de la Documentation - Application Budget

## 🎯 Guides Principaux

### 📱 Module Profil Utilisateur
- **[README_PROFILE.md](README_PROFILE.md)** - Point d'entrée principal
  - Vue d'ensemble
  - Démarrage rapide
  - Exemples d'intégration
  
- **[PROFILE_FEATURE_SUMMARY.md](PROFILE_FEATURE_SUMMARY.md)** - Documentation complète
  - Architecture détaillée
  - Tous les endpoints
  - Exemples React/Vue.js
  
- **[src/profile/PROFILE_API.md](src/profile/PROFILE_API.md)** - Référence API
  - Documentation technique complète
  - Paramètres détaillés
  - Codes d'erreur

- **[src/profile/QUICK_START.md](src/profile/QUICK_START.md)** - Guide rapide
  - Exemples cURL
  - Tests rapides
  - Débogage

### 🧪 Outils de Test
- **[src/profile/test-profile.html](src/profile/test-profile.html)** - Interface de test interactive

---

## 📂 Structure du Projet

```
/mnt/data/budget/nest_api/
│
├── README_PROFILE.md                    # 📖 Point d'entrée
├── PROFILE_FEATURE_SUMMARY.md          # 📋 Vue d'ensemble
├── DOCUMENTATION_INDEX.md              # 📚 Ce fichier
│
├── src/
│   ├── profile/                        # 📱 Module Profil
│   │   ├── profile.controller.ts       # 🎮 Contrôleur
│   │   ├── profile.service.ts          # ⚙️  Service
│   │   ├── profile.module.ts           # 📦 Module
│   │   ├── dto/                        # 📝 Types
│   │   ├── PROFILE_API.md              # 📘 API Référence
│   │   ├── QUICK_START.md              # 🚀 Guide rapide
│   │   └── test-profile.html           # 🧪 Page de test
│   │
│   ├── ticket/                         # 🎫 Module Tickets
│   ├── entity/                         # 💾 Entités DB
│   └── ...
│
└── uploads/
    └── profiles/                       # 📸 Photos de profil
```

---

## 🔍 Trouver Rapidement

### Vous voulez...

**🚀 Commencer rapidement ?**
→ `README_PROFILE.md`

**📖 Comprendre l'architecture ?**
→ `PROFILE_FEATURE_SUMMARY.md`

**🔧 Intégrer dans votre frontend ?**
→ `src/profile/PROFILE_API.md`

**🧪 Tester immédiatement ?**
→ `src/profile/test-profile.html`

**⚡ Exemples cURL rapides ?**
→ `src/profile/QUICK_START.md`

---

## 📊 Modules Disponibles

| Module | Status | Documentation |
|--------|--------|---------------|
| Profil Utilisateur | ✅ Opérationnel | README_PROFILE.md |
| Tickets de Caisse | ✅ Opérationnel | src/ticket/ |
| Authentification | ✅ Opérationnel | src/connection/ |
| Catégories | ✅ Opérationnel | src/categorie/ |
| Dépenses | ✅ Opérationnel | src/spend/ |
| Revenus | ✅ Opérationnel | src/revenue/ |
| Enveloppes | ✅ Opérationnel | src/envelopes/ |

---

## 🎯 Endpoints API Principaux

### Profil (`/profile`)
- `POST /profile/me` - Mon profil
- `PUT /profile/update` - Mettre à jour
- `POST /profile/upload-picture` - Upload photo
- `DELETE /profile/delete-picture` - Supprimer photo
- `GET /profile/picture/:userId` - Voir photo

### Tickets (`/ticket`)
- `POST /ticket/upload` - Upload ticket
- `POST /ticket/all` - Tous mes tickets
- `GET /ticket/image/:id` - Image ticket

### Authentification (`/connection`)
- `POST /connection/signup` - Inscription
- `POST /connection/login` - Connexion

---

## 🆘 Aide Rapide

**L'API ne répond pas ?**
```bash
curl http://localhost:3000/
tail -f /tmp/budget_app.log
```

**Redémarrer l'application ?**
```bash
lsof -ti:3000 | xargs kill -9
npm run start:prod > /tmp/budget_app.log 2>&1 &
```

**Voir les logs ?**
```bash
tail -f /tmp/budget_app.log
```

---

**📅 Dernière mise à jour : Octobre 2025**
**✨ Toutes les fonctionnalités sont opérationnelles**
