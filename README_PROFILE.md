# 📱 Module Profil Utilisateur - Application Budget

## 🎯 Fonctionnalités Implémentées

Votre application de budget dispose maintenant d'un système complet de gestion de profil utilisateur avec :

- ✅ **Consultation du profil** - Voir toutes les informations personnelles
- ✅ **Modification du profil** - Mettre à jour nom, prénom, téléphone, adresse, date de naissance
- ✅ **Photo de profil** - Upload, modification et suppression
- ✅ **Sécurité JWT** - Toutes les opérations sont sécurisées
- ✅ **API RESTful** - Endpoints propres et bien documentés

---

## 🚀 Démarrage Rapide

### 1. L'API est déjà en ligne

```bash
# Vérifier que l'API fonctionne
curl http://localhost:3000/
# Devrait retourner: Hello World!
```

### 2. Tester avec la page HTML

Ouvrez dans votre navigateur :
```
file:///mnt/data/budget/nest_api/src/profile/test-profile.html
```

### 3. Exemples d'Utilisation

```bash
# Récupérer votre profil
curl -X POST http://localhost:3000/profile/me \
  -H "Content-Type: application/json" \
  -d '{"jwt": "VOTRE_TOKEN"}'

# Uploader une photo
curl -X POST http://localhost:3000/profile/upload-picture \
  -F "file=@photo.jpg" \
  -F "jwt=VOTRE_TOKEN"

# Voir la photo dans le navigateur
http://localhost:3000/profile/picture/1
```

---

## 📚 Documentation

| Fichier | Description |
|---------|-------------|
| **PROFILE_FEATURE_SUMMARY.md** | Vue d'ensemble complète du module |
| **src/profile/PROFILE_API.md** | Documentation détaillée de l'API |
| **src/profile/QUICK_START.md** | Guide de démarrage rapide |
| **src/profile/test-profile.html** | Interface de test |

---

## 🔗 Endpoints API

### Profil

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/profile/me` | Récupérer son profil |
| PUT | `/profile/update` | Mettre à jour son profil |
| POST | `/profile/upload-picture` | Uploader une photo |
| DELETE | `/profile/delete-picture` | Supprimer sa photo |
| GET | `/profile/picture/:userId` | Voir une photo de profil |

---

## 💾 Structure de la Base de Données

### Table `user` - Nouveaux Champs

```sql
profilePicture   VARCHAR(255)  NULL  -- Chemin de la photo
phoneNumber      VARCHAR(255)  NULL  -- Numéro de téléphone
dateOfBirth      DATE          NULL  -- Date de naissance
address          VARCHAR(255)  NULL  -- Adresse
```

TypeORM crée automatiquement ces colonnes au démarrage (synchronize: true).

---

## 📁 Structure des Fichiers

```
src/profile/
├── profile.controller.ts      # Endpoints API
├── profile.service.ts         # Logique métier
├── profile.module.ts          # Module NestJS
├── dto/
│   └── update-profile.dto.ts  # Types de données
├── PROFILE_API.md             # Documentation API
├── QUICK_START.md             # Guide rapide
└── test-profile.html          # Page de test

uploads/
└── profiles/                  # Photos de profil
    └── profile-{uuid}.jpg
```

---

## 🔐 Sécurité

- **Authentification JWT** requise pour toutes les opérations (sauf GET picture)
- **Validation** des formats d'images (JPG, JPEG, PNG uniquement)
- **Limite de taille** : 5 MB par photo
- **Suppression automatique** de l'ancienne photo lors de l'upload
- **Stockage sécurisé** dans `uploads/profiles/`

---

## 🧪 Tests Effectués

✅ Compilation réussie
✅ Module chargé correctement
✅ 5 routes créées et mappées
✅ Dossier uploads/profiles créé
✅ API accessible sur le port 3000

---

## 💡 Exemples d'Intégration Frontend

### React

```jsx
import { useState, useEffect } from 'react';

function ProfilePage({ userToken }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const res = await fetch('http://localhost:3000/profile/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwt: userToken })
    });
    const data = await res.json();
    setProfile(data.profile);
  };

  const handlePhotoUpload = async (e) => {
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('jwt', userToken);

    await fetch('http://localhost:3000/profile/upload-picture', {
      method: 'POST',
      body: formData
    });
    loadProfile();
  };

  return (
    <div>
      {profile?.profilePicture && (
        <img src={`http://localhost:3000/profile/picture/${profile.id}`} />
      )}
      <input type="file" onChange={handlePhotoUpload} />
      <p>{profile?.nom} {profile?.prenom}</p>
      <p>{profile?.email}</p>
    </div>
  );
}
```

### Vue.js

```vue
<template>
  <div class="profile">
    <img v-if="profile?.profilePicture"
         :src="`http://localhost:3000/profile/picture/${profile.id}`" />
    <input type="file" @change="uploadPhoto" />
    <p>{{ profile?.nom }} {{ profile?.prenom }}</p>
    <p>{{ profile?.email }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return { profile: null };
  },
  mounted() {
    this.loadProfile();
  },
  methods: {
    async loadProfile() {
      const res = await fetch('http://localhost:3000/profile/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt: this.userToken })
      });
      const data = await res.json();
      this.profile = data.profile;
    },
    async uploadPhoto(e) {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      formData.append('jwt', this.userToken);

      await fetch('http://localhost:3000/profile/upload-picture', {
        method: 'POST',
        body: formData
      });
      this.loadProfile();
    }
  }
};
</script>
```

---

## 🐛 Débogage

### Voir les logs en temps réel

```bash
tail -f /tmp/budget_app.log
```

### Vérifier les routes chargées

```bash
tail -100 /tmp/budget_app.log | grep profile
```

### Tester la connexion

```bash
curl http://localhost:3000/
```

---

## 🔄 Redémarrage de l'Application

Si vous modifiez le code :

```bash
# 1. Compiler
npm run build

# 2. Tuer l'ancienne instance
lsof -ti:3000 | xargs kill -9

# 3. Redémarrer
npm run start:prod > /tmp/budget_app.log 2>&1 &

# 4. Vérifier les logs
tail -f /tmp/budget_app.log
```

---

## ⚡ Prochaines Étapes Suggérées

1. **Interface utilisateur**
   - Créer une belle page de profil dans votre frontend
   - Ajouter un crop d'image avant upload
   - Prévisualisation de la photo

2. **Améliorations**
   - Compression automatique des images
   - Génération de thumbnails
   - Support de plusieurs photos

3. **Validation**
   - Ajouter class-validator
   - Valider les formats de téléphone
   - Limiter la longueur des champs

---

## 📞 Support

**Documentation :**
- `PROFILE_FEATURE_SUMMARY.md` - Vue d'ensemble
- `src/profile/PROFILE_API.md` - Documentation API
- `src/profile/QUICK_START.md` - Guide rapide

**Test :**
- Ouvrir `src/profile/test-profile.html` dans le navigateur

**Logs :**
```bash
tail -f /tmp/budget_app.log
```

---

## ✅ Checklist de Vérification

- [x] Module compilé et chargé
- [x] 5 endpoints fonctionnels
- [x] Base de données mise à jour
- [x] Dossier uploads/profiles créé
- [x] Documentation complète
- [x] Page de test fournie
- [x] API accessible sur le port 3000

---

**🎉 Votre module profil est opérationnel et prêt à l'emploi !**

Pour plus de détails, consultez la documentation complète dans :
- `PROFILE_FEATURE_SUMMARY.md`
- `src/profile/PROFILE_API.md`
- `src/profile/QUICK_START.md`
