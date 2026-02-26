# API de Gestion de Profil Utilisateur

Cette API permet aux utilisateurs de gérer leur profil, y compris la photo de profil.

## Endpoints Disponibles

### 1. Récupérer le Profil Utilisateur

**Endpoint:** `POST /profile/me`

**Description:** Récupère les informations de profil de l'utilisateur connecté.

**Body:**
```json
{
  "jwt": "votre_token_jwt"
}
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "profile": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Doe",
    "prenom": "John",
    "profilePicture": "/path/to/profile.jpg",
    "phoneNumber": "+33612345678",
    "dateOfBirth": "1990-01-01",
    "address": "123 Rue de Paris, 75001 Paris",
    "isEmailVerified": true
  }
}
```

---

### 2. Mettre à Jour le Profil

**Endpoint:** `PUT /profile/update`

**Description:** Met à jour les informations du profil utilisateur.

**Body:**
```json
{
  "jwt": "votre_token_jwt",
  "nom": "Nouveau Nom",
  "prenom": "Nouveau Prénom",
  "phoneNumber": "+33612345678",
  "dateOfBirth": "1990-01-01",
  "address": "123 Rue de Paris, 75001 Paris"
}
```

**Note:** Tous les champs sont optionnels sauf `jwt`. Seuls les champs fournis seront mis à jour.

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Profil mis à jour avec succès",
  "profile": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Nouveau Nom",
    "prenom": "Nouveau Prénom",
    "phoneNumber": "+33612345678",
    "dateOfBirth": "1990-01-01",
    "address": "123 Rue de Paris, 75001 Paris",
    "isEmailVerified": true
  }
}
```

---

### 3. Uploader une Photo de Profil

**Endpoint:** `POST /profile/upload-picture`

**Description:** Upload une nouvelle photo de profil (remplace l'ancienne si elle existe).

**Content-Type:** `multipart/form-data`

**Paramètres:**
- `file`: Fichier image (JPG, JPEG, PNG - max 5MB)
- `jwt`: Token JWT (dans le body)

**Exemple avec cURL:**
```bash
curl -X POST http://localhost:3000/profile/upload-picture \
  -F "file=@/path/to/photo.jpg" \
  -F "jwt=votre_token_jwt"
```

**Exemple avec JavaScript (fetch):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('jwt', userToken);

fetch('http://localhost:3000/profile/upload-picture', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Photo de profil uploadée avec succès",
  "profile": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Doe",
    "prenom": "John",
    "profilePicture": "/path/to/uploads/profiles/profile-uuid.jpg"
  },
  "metadata": {
    "fileName": "photo.jpg",
    "fileSize": 245678
  }
}
```

**Erreurs Possibles:**
- `400`: Format de fichier non supporté
- `400`: Fichier trop volumineux (max 5MB)
- `401`: Token JWT invalide
- `500`: Erreur serveur

---

### 4. Supprimer la Photo de Profil

**Endpoint:** `DELETE /profile/delete-picture`

**Description:** Supprime la photo de profil actuelle de l'utilisateur.

**Body:**
```json
{
  "jwt": "votre_token_jwt"
}
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "message": "Photo de profil supprimée avec succès",
  "profile": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Doe",
    "prenom": "John",
    "profilePicture": null
  }
}
```

---

### 5. Récupérer la Photo de Profil d'un Utilisateur

**Endpoint:** `GET /profile/picture/:userId`

**Description:** Récupère l'image de profil d'un utilisateur spécifique.

**Paramètres:**
- `userId`: ID de l'utilisateur (dans l'URL)

**Exemple:**
```
GET http://localhost:3000/profile/picture/1
```

**Réponse Succès (200):**
- Retourne directement le fichier image

**Utilisation dans HTML:**
```html
<img src="http://localhost:3000/profile/picture/1" alt="Photo de profil">
```

**Erreurs Possibles:**
- `404`: Photo de profil non trouvée
- `404`: Utilisateur non trouvé
- `500`: Erreur serveur

---

## Sécurité

- Tous les endpoints (sauf GET picture) nécessitent un token JWT valide
- Les photos sont limitées à 5MB
- Seuls les formats JPG, JPEG et PNG sont acceptés
- L'ancienne photo est automatiquement supprimée lors de l'upload d'une nouvelle

---

## Structure des Données

### Entité User (Profil)

```typescript
{
  id: number;                    // ID unique
  email: string;                 // Email (unique)
  nom: string;                   // Nom de famille
  prenom: string;                // Prénom
  profilePicture?: string;       // Chemin de la photo de profil (optionnel)
  phoneNumber?: string;          // Numéro de téléphone (optionnel)
  dateOfBirth?: Date;            // Date de naissance (optionnel)
  address?: string;              // Adresse (optionnel)
  isEmailVerified: boolean;      // Email vérifié ou non
}
```

---

## Exemples d'Utilisation Complète

### Frontend React/Vue.js

```javascript
// Composant de profil utilisateur
class ProfileComponent {

  // Récupérer le profil
  async getProfile(jwt) {
    const response = await fetch('http://localhost:3000/profile/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwt })
    });
    return response.json();
  }

  // Mettre à jour le profil
  async updateProfile(jwt, data) {
    const response = await fetch('http://localhost:3000/profile/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwt, ...data })
    });
    return response.json();
  }

  // Uploader une photo
  async uploadPhoto(jwt, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jwt', jwt);

    const response = await fetch('http://localhost:3000/profile/upload-picture', {
      method: 'POST',
      body: formData
    });
    return response.json();
  }

  // Supprimer la photo
  async deletePhoto(jwt) {
    const response = await fetch('http://localhost:3000/profile/delete-picture', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwt })
    });
    return response.json();
  }
}
```

---

## Stockage des Photos

Les photos de profil sont stockées dans :
```
/mnt/data/budget/nest_api/uploads/profiles/
```

Format des noms de fichiers :
```
profile-{uuid}.{extension}
```

Exemple :
```
profile-a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.jpg
```

---

## Notes de Migration

Si vous migrez depuis une ancienne version :
1. Les nouveaux champs (`profilePicture`, `phoneNumber`, etc.) sont optionnels
2. TypeORM créera automatiquement les colonnes lors du prochain démarrage (si `synchronize: true`)
3. Les utilisateurs existants auront `null` pour ces nouveaux champs
