# 🚀 Quick Start - API Profil Utilisateur

## Démarrage Rapide en 3 Étapes

### 1️⃣ Obtenir votre Token JWT

Connectez-vous d'abord à votre application pour obtenir un token JWT :

```bash
curl -X POST http://localhost:3000/connection/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "votre@email.com",
    "password": "votre_mot_de_passe"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**Copiez le token** pour les prochaines étapes.

---

### 2️⃣ Récupérer Votre Profil

```bash
curl -X POST http://localhost:3000/profile/me \
  -H "Content-Type: application/json" \
  -d '{
    "jwt": "VOTRE_TOKEN_ICI"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "profile": {
    "id": 1,
    "email": "votre@email.com",
    "nom": "Votre Nom",
    "prenom": "Votre Prénom",
    "profilePicture": null,
    "phoneNumber": null,
    "dateOfBirth": null,
    "address": null,
    "isEmailVerified": true
  }
}
```

---

### 3️⃣ Uploader une Photo de Profil

```bash
curl -X POST http://localhost:3000/profile/upload-picture \
  -F "file=@/chemin/vers/votre/photo.jpg" \
  -F "jwt=VOTRE_TOKEN_ICI"
```

**Réponse :**
```json
{
  "success": true,
  "message": "Photo de profil uploadée avec succès",
  "profile": {
    "id": 1,
    "email": "votre@email.com",
    "nom": "Votre Nom",
    "prenom": "Votre Prénom",
    "profilePicture": "/mnt/data/budget/nest_api/uploads/profiles/profile-abc123.jpg"
  },
  "metadata": {
    "fileName": "photo.jpg",
    "fileSize": 245678
  }
}
```

---

## 🎯 Cas d'Usage Courants

### ✏️ Mettre à Jour Vos Informations

```bash
curl -X PUT http://localhost:3000/profile/update \
  -H "Content-Type: application/json" \
  -d '{
    "jwt": "VOTRE_TOKEN",
    "nom": "Dupont",
    "prenom": "Marie",
    "phoneNumber": "+33612345678",
    "dateOfBirth": "1990-05-15",
    "address": "123 Rue de Paris, 75001 Paris"
  }'
```

**💡 Astuce :** Vous n'êtes pas obligé de fournir tous les champs. Seuls les champs fournis seront mis à jour.

**Exemple de mise à jour partielle :**
```bash
curl -X PUT http://localhost:3000/profile/update \
  -H "Content-Type: application/json" \
  -d '{
    "jwt": "VOTRE_TOKEN",
    "phoneNumber": "+33612345678"
  }'
```

---

### 📸 Voir Votre Photo de Profil

**Dans le navigateur :**
```
http://localhost:3000/profile/picture/1
```
(Remplacez `1` par votre ID utilisateur)

**Dans une page HTML :**
```html
<img src="http://localhost:3000/profile/picture/1" alt="Mon profil">
```

**Dans React/Vue :**
```jsx
<img src={`http://localhost:3000/profile/picture/${userId}`} alt="Profil" />
```

---

### 🗑️ Supprimer Votre Photo

```bash
curl -X DELETE http://localhost:3000/profile/delete-picture \
  -H "Content-Type: application/json" \
  -d '{
    "jwt": "VOTRE_TOKEN"
  }'
```

---

## 🧪 Test avec la Page HTML

La manière **la plus simple** de tester :

1. **Ouvrez** `src/profile/test-profile.html` dans votre navigateur
2. **Entrez** votre token JWT dans le champ prévu
3. **Cliquez** sur "Charger mon profil"
4. **Testez** toutes les fonctionnalités via l'interface

---

## 🌐 Intégration Frontend JavaScript

### Vanilla JavaScript

```javascript
// Configuration
const API_URL = 'http://localhost:3000';
const userToken = 'VOTRE_TOKEN_JWT';

// Récupérer le profil
async function loadProfile() {
  const response = await fetch(`${API_URL}/profile/me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jwt: userToken })
  });
  const data = await response.json();
  console.log('Profil:', data.profile);
  return data.profile;
}

// Mettre à jour le profil
async function updateProfile(updates) {
  const response = await fetch(`${API_URL}/profile/update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jwt: userToken, ...updates })
  });
  const data = await response.json();
  console.log('Profil mis à jour:', data.profile);
  return data.profile;
}

// Uploader une photo
async function uploadPhoto(fileInput) {
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('jwt', userToken);

  const response = await fetch(`${API_URL}/profile/upload-picture`, {
    method: 'POST',
    body: formData
  });
  const data = await response.json();
  console.log('Photo uploadée:', data);
  return data;
}

// Utilisation
loadProfile();
updateProfile({ phoneNumber: '+33612345678' });
```

### Avec Axios

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Configuration Axios
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Récupérer le profil
async function getProfile(jwt) {
  const { data } = await api.post('/profile/me', { jwt });
  return data.profile;
}

// Mettre à jour le profil
async function updateProfile(jwt, updates) {
  const { data } = await api.put('/profile/update', { jwt, ...updates });
  return data.profile;
}

// Uploader une photo
async function uploadPhoto(jwt, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('jwt', jwt);

  const { data } = await api.post('/profile/upload-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
```

---

## ⚡ Raccourcis Utiles

### Variables d'environnement (pour tests)

Créez un fichier `.env.test` :
```env
API_URL=http://localhost:3000
JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Script de test rapide

Créez un fichier `test-profile.sh` :
```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:3000"
JWT="VOTRE_TOKEN"

# Test 1: Récupérer le profil
echo "=== Test: Récupération du profil ==="
curl -X POST "$API_URL/profile/me" \
  -H "Content-Type: application/json" \
  -d "{\"jwt\": \"$JWT\"}" | jq .

# Test 2: Mettre à jour le profil
echo -e "\n=== Test: Mise à jour du profil ==="
curl -X PUT "$API_URL/profile/update" \
  -H "Content-Type: application/json" \
  -d "{\"jwt\": \"$JWT\", \"phoneNumber\": \"+33612345678\"}" | jq .

# Test 3: Upload photo (si vous avez une photo)
# echo -e "\n=== Test: Upload photo ==="
# curl -X POST "$API_URL/profile/upload-picture" \
#   -F "file=@./photo.jpg" \
#   -F "jwt=$JWT" | jq .
```

Rendez-le exécutable :
```bash
chmod +x test-profile.sh
./test-profile.sh
```

---

## 🔍 Débogage

### Vérifier que l'API fonctionne

```bash
curl http://localhost:3000/
```
Doit retourner : `Hello World!`

### Vérifier les routes profile

```bash
curl -s http://localhost:3000/ | grep profile
```

### Voir les logs de l'application

```bash
tail -f /tmp/budget_app.log
```

### Tester avec un JWT invalide (pour voir l'erreur)

```bash
curl -X POST http://localhost:3000/profile/me \
  -H "Content-Type: application/json" \
  -d '{"jwt": "token_invalide"}'
```

**Doit retourner :**
```json
{
  "statusCode": 401,
  "message": "Token JWT invalide"
}
```

---

## 💡 Astuces

### 1. Format de la date de naissance

Utilisez le format ISO : `YYYY-MM-DD`
```json
"dateOfBirth": "1990-05-15"
```

### 2. Taille maximale des photos

- **Maximum:** 5 MB
- **Formats:** JPG, JPEG, PNG

### 3. Champs optionnels

Tous les champs sauf `jwt` sont optionnels dans la mise à jour.
Vous pouvez mettre à jour seulement ce dont vous avez besoin.

### 4. Récupération de photo

L'endpoint `/profile/picture/:userId` ne nécessite PAS de JWT.
Cela permet d'afficher les photos de profil publiquement.

---

## 📝 Checklist de Test

- [ ] Se connecter et obtenir un JWT
- [ ] Récupérer son profil
- [ ] Mettre à jour son nom
- [ ] Mettre à jour son téléphone
- [ ] Uploader une photo de profil
- [ ] Visualiser la photo dans le navigateur
- [ ] Mettre à jour la photo
- [ ] Supprimer la photo
- [ ] Vérifier que l'ancienne photo est bien supprimée

---

## 🆘 Problèmes Courants

### "Token JWT invalide"
- Vérifiez que vous utilisez le bon token
- Le token peut avoir expiré (durée de vie: 1 jour)
- Reconnectez-vous pour obtenir un nouveau token

### "Format de fichier non supporté"
- Utilisez uniquement JPG, JPEG ou PNG
- Vérifiez l'extension du fichier

### "Fichier trop volumineux"
- Limite: 5 MB
- Compressez votre image avant l'upload

### "Image non trouvée"
- L'utilisateur n'a pas de photo de profil
- Le fichier a été supprimé du serveur

---

**🎉 Vous êtes prêt à utiliser l'API de profil !**

Pour plus de détails, consultez `PROFILE_API.md`
