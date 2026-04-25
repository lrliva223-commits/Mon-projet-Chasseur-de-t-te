# Backend Chasseur de Tête

API REST Node.js/Express pour l'application Chasseur de tête.

## Installation

1. **Installer les dépendances :**
   ```bash
   cd backend
   npm install
   ```

2. **Configurer la base de données :**
   - Modifier `.env` avec tes credentials MySQL
   - Exécuter le script de configuration :
   ```bash
   npm run setup-db
   ```
   Cela créera automatiquement la base `headhunter_db` et appliquera le schéma.

3. **Lancer le serveur :**
   ```bash
   npm run dev  # développement (avec nodemon)
   # ou
   npm start    # production
   ```

Le serveur sera accessible sur `http://localhost:5000`

## API Endpoints

### Authentification
- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion

### Offres
- `GET /api/v1/offres` - Liste des offres (avec filtres)
- `POST /api/v1/offres` - Créer une offre (recruteur/entreprise)

### Candidatures
- `POST /api/v1/candidatures` - Postuler à une offre
- `GET /api/v1/candidatures` - Mes candidatures (candidat)

### Candidats
- `GET /api/v1/candidats/profil` - Récupérer le profil candidat
- `PUT /api/v1/candidats/profil` - Mettre à jour le profil candidat
- `POST /api/v1/candidats/upload-cv` - Upload du CV (PDF/DOC/DOCX)

### Admin
- `GET /api/v1/admin/stats` - Statistiques globales
- `GET /api/v1/admin/entreprises-pending` - Entreprises en attente de validation
- `PATCH /api/v1/admin/entreprises/:id/valider` - Valider/refuser une entreprise
- `GET /api/v1/admin/users` - Liste des utilisateurs
- `PATCH /api/v1/admin/users/:id/statut` - Changer le statut d'un utilisateur
- `DELETE /api/v1/admin/users/:id` - Supprimer un utilisateur

### Messagerie
- `GET /api/v1/messages/conversations` - Liste des conversations
- `GET /api/v1/messages/conversation/:userId` - Messages d'une conversation
- `POST /api/v1/messages` - Envoyer un message

## Configuration

Modifier le fichier `.env` :
```
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=ton_mot_de_passe
DB_NAME=headhunter_db
JWT_SECRET=ton_secret_jwt
PORT=5000
```

## Test

Visiter `http://localhost:5000/api/v1/health` pour vérifier que l'API fonctionne.