# API Ichrak - Plateforme Multi-Domaines

## Description

Plateforme API multi-domaines pour **Pièces Auto** (pièces automobiles) et **Droguerie** (matériaux de construction et quincaillerie) construite avec NestJS, TypeScript et PostgreSQL.

Cette plateforme supporte plusieurs rôles utilisateurs :
- **Super Admin** : Contrôle complet de la plateforme
- **Admin Pièces Auto** : Gérant de magasin gérant uniquement le domaine Pièces Auto
- **Admin Droguerie** : Gérant de magasin gérant uniquement le domaine Droguerie
- **Artisan** : Prestataire de services (mécanicien, plombier, peintre, etc.)
- **Client** : Client final utilisant les services et achetant des produits

## Fonctionnalités Principales

✅ **Authentication JWT** avec système de rôles
✅ **Multi-domaines** (Pièces Auto, Droguerie)
✅ **Admins spécifiques par domaine**
✅ **Catégories hiérarchiques** (profondeur illimitée)
✅ **Support bilingue** (Français + Arabe)
✅ **Catalogue global** de produits
✅ **Marketplace** (chaque admin fixe ses prix)
✅ **Système de codes promo**
✅ **Parrainage multi-niveaux** (2 niveaux)
✅ **Calcul automatique des commissions**
✅ **Recherche multilingue**

## Documentation

📚 **[DOCUMENTATION_FR.md](DOCUMENTATION_FR.md)** - Documentation complète en français (400+ lignes)

Guides spécifiques :
- [DOMAIN_ADMINS_GUIDE.md](DOMAIN_ADMINS_GUIDE.md) - Guide des admins par domaine
- [PRODUCTS_API_GUIDE.md](PRODUCTS_API_GUIDE.md) - Guide des produits globaux
- [ADMIN_PRODUCTS_GUIDE.md](ADMIN_PRODUCTS_GUIDE.md) - Guide de la marketplace
- [PROMO_CODES_GUIDE.md](PROMO_CODES_GUIDE.md) - Guide des codes promo

## Prérequis

- Node.js (v16 ou supérieur)
- PostgreSQL (v13 ou supérieur)
- npm ou yarn

## Installation

### 1. Cloner le projet

```bash
cd /mnt/c/Users/pc/Desktop/js/ichrak
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=votre_mot_de_passe
DATABASE_NAME=ichrak_db

# JWT
JWT_SECRET=votre_secret_jwt_securise
JWT_EXPIRATION=7d

# Server
PORT=3000
```

### 4. Créer la base de données PostgreSQL

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE ichrak_db;

# Quitter
\q
```

### 5. Initialiser les données (optionnel)

```bash
npm run seed
```

Cela créera :
- 2 Domaines (Pièces Auto, Droguerie)
- Super Admin
- 2 Admins (un par domaine)
- Catégories de services
- Catégories de produits
- Produits globaux exemples

## Démarrage

```bash
# Mode développement
npm run start:dev

# Mode production
npm run build
npm run start:prod

# Tests
npm run test

# Tests e2e
npm run test:e2e
```

L'API sera accessible sur `http://localhost:3000`

## Comptes par Défaut (après seed)

### Super Admin
```
Email: superadmin@ichrak.com
Password: SuperAdmin123!
```

### Admin Pièces Auto
```
Email: admin.pieceauto@ichrak.com
Password: Admin123!
```

### Admin Droguerie
```
Email: admin.droguerie@ichrak.com
Password: Admin123!
```

## Domaines

### 1. Pièces Auto
Catégories de services :
- Lavage
- Parking
- Mécanicien
- Visite Technique

### 2. Droguerie
Catégories de services :
- Peintre
- Maçon
- Plombier
- Électricien

## Architecture du Système

```
Super Admin
    ↓
    ├─→ Gère les Domaines (Pièces Auto, Droguerie)
    ├─→ Crée les Produits Globaux (catalogue)
    └─→ Supervise tous les Admins

Admin Pièces Auto / Admin Droguerie
    ↓
    ├─→ Sélectionne des Produits Globaux
    ├─→ Ajoute ses propres prix, quantités, localisation
    ├─→ Crée des Codes Promo
    └─→ Gère son inventaire

Client / Artisan
    ↓
    ├─→ Parcourt les produits disponibles
    ├─→ Reçoit et partage des Codes Promo
    ├─→ Effectue des achats avec réduction
    └─→ Gagne des commissions de parrainage
```

## Endpoints API Principaux

### Authentication
- `POST /auth/register` - Inscription
- `POST /auth/login` - Connexion
- `GET /auth/profile` - Profil utilisateur

### Utilisateurs
- `GET /users` - Liste des utilisateurs
- `GET /users/:id` - Détails utilisateur
- `PATCH /users/:id` - Modifier utilisateur
- `DELETE /users/:id` - Supprimer utilisateur

### Domaines
- `POST /domains` - Créer domaine (Super Admin)
- `GET /domains` - Liste des domaines
- `PATCH /domains/:id` - Modifier domaine

### Catégories de Services
- `POST /categories` - Créer catégorie
- `GET /categories` - Liste des catégories
- `GET /categories?domainId=xxx` - Filtrer par domaine

### Services
- `POST /services` - Créer service (Artisan)
- `GET /services` - Liste des services
- `GET /services/search?q=xxx` - Rechercher services

### Catégories de Produits (Hiérarchique)
- `POST /product-categories` - Créer catégorie
- `GET /product-categories` - Liste (avec hiérarchie)
- `GET /product-categories/:id/path` - Chemin complet

### Produits Globaux (Catalogue)
- `POST /global-products` - Créer produit (Super Admin)
- `GET /global-products` - Liste des produits
- `GET /global-products/search?q=xxx` - Rechercher

### Produits Admin (Marketplace)
- `POST /admin-products` - Ajouter à mon inventaire
- `GET /admin-products/my-products` - Mes produits
- `GET /admin-products?domainId=xxx` - Produits par domaine
- `GET /admin-products/search?q=xxx` - Rechercher

### Codes Promo
- `POST /promo-codes` - Créer code (Admin)
- `POST /promo-codes/assign` - S'assigner un code
- `POST /promo-codes/use` - Utiliser un code
- `GET /promo-codes/my-earnings` - Mes gains

## Exemples de Requêtes

### 1. Inscription Client

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "Password123!",
    "fullName": "Ahmed Alami",
    "phone": "0612345678",
    "role": "CLIENT",
    "address": "Casablanca, Maroc"
  }'
```

### 2. Connexion

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "Password123!"
  }'
```

### 3. Admin Ajoute un Produit

```bash
curl -X POST http://localhost:3000/admin-products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{
    "globalProductId": "uuid-produit-global",
    "price": 150,
    "quantity": 50,
    "location": "Derb Omar, Casablanca"
  }'
```

### 4. Créer un Code Promo

```bash
curl -X POST http://localhost:3000/promo-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "code": "CASA15",
    "reductionPercent": 15,
    "commissionPercent": 5,
    "maxUses": 100,
    "description": "15% de réduction"
  }'
```

### 5. Utiliser un Code Promo

```bash
curl -X POST http://localhost:3000/promo-codes/use \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "code": "CASA15",
    "amount": 1000,
    "productId": "uuid-produit"
  }'
```

## Structure du Projet

```
src/
├── auth/                    # Authentication et autorisation
│   ├── decorators/          # Décorateurs personnalisés
│   ├── dto/                 # DTOs Login et Register
│   ├── guards/              # Guards JWT, Roles, Domain
│   └── strategies/          # Stratégie JWT
├── users/                   # Gestion des utilisateurs
├── domains/                 # Gestion des domaines
├── categories/              # Catégories de services
├── services/                # Services des artisans
├── product-categories/      # Catégories de produits (hiérarchique)
├── global-products/         # Catalogue global (bilingue)
├── admin-products/          # Inventaire des admins (marketplace)
├── promo-codes/             # Codes promo et parrainage
│   ├── entities/
│   │   ├── promo-code.entity.ts
│   │   ├── user-promo-code.entity.ts
│   │   └── promo-code-usage.entity.ts
│   ├── dto/
│   ├── promo-codes.controller.ts
│   ├── promo-codes.service.ts
│   └── promo-codes.module.ts
├── common/                  # Code partagé
│   └── enums/               # Enums (Role, DomainType)
└── database/                # Scripts de seed
```

## Sécurité

- ✅ Authentication JWT avec expiration configurable
- ✅ Hachage des mots de passe avec bcrypt (10 rounds)
- ✅ Contrôle d'accès basé sur les rôles (RBAC)
- ✅ Guards de sécurité (JWT, Roles, Domain)
- ✅ Validation des données avec class-validator
- ✅ Protection contre les injections SQL (TypeORM)
- ✅ CORS activé

## Base de Données

### Tables Principales

1. **users** - Utilisateurs (tous les rôles)
2. **domains** - Domaines (Pièces Auto, Droguerie)
3. **categories** - Catégories de services
4. **services** - Services des artisans
5. **product_categories** - Catégories de produits (hiérarchique)
6. **global_products** - Catalogue global
7. **admin_products** - Inventaire des admins
8. **promo_codes** - Codes promo
9. **user_promo_codes** - Attribution des codes
10. **promo_code_usages** - Historique d'utilisation

## Déploiement en Production

1. Définir `synchronize: false` dans `app.module.ts`
2. Utiliser les migrations pour les changements de schéma
3. Configurer un `JWT_SECRET` fort
4. Configurer CORS avec les origines autorisées
5. Utiliser des variables d'environnement spécifiques

## Technologies Utilisées

- **NestJS** - Framework Node.js progressif
- **TypeScript** - Langage typé
- **PostgreSQL** - Base de données relationnelle
- **TypeORM** - ORM pour TypeScript
- **Passport-JWT** - Stratégie d'authentication
- **class-validator** - Validation des DTOs
- **bcrypt** - Hachage des mots de passe

## Ressources

- [Documentation NestJS](https://docs.nestjs.com)
- [Documentation TypeORM](https://typeorm.io)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)

## Support

Pour toute question ou problème, consultez la documentation complète dans [DOCUMENTATION_FR.md](DOCUMENTATION_FR.md)

## License

MIT
