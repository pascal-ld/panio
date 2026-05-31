# Panio

Application de gestion de paniers maraîchers — monorepo **Next.js (PWA)** + **Symfony (API JWT)** + **MariaDB**.

## Structure

```
panio/
├── backend/    # API Symfony 7 + Lexik JWT + Doctrine
├── frontend/   # Next.js 15 (App Router) + PWA
└── docker-compose.yml
```

## Prérequis

- Docker & Docker Compose
- Ou en local : PHP 8.2+, Composer, Node.js 20+, MariaDB

## Démarrage rapide (Docker)

```bash
# Clés JWT (une fois)
cd backend
composer install
php bin/console lexik:jwt:generate-keypair --overwrite
cd ..

# Variables d'environnement (déjà fourni en local)
cp .env.example .env   # si besoin

# Dev local (Traefik + réseau lino requis)
docker compose up -d
```

- Front : http://panio.local
- API : http://back.panio.local
- Mailpit : http://mail.panio.local
- phpMyAdmin : http://pma.panio.local

Les domaines et URLs sont définis dans `.env` à la racine. Le compose dev (`docker-compose.dev.yml`) est chargé automatiquement via `COMPOSE_FILE`.

### Production

```bash
# Sur le serveur : copier et adapter .env.prod (domaine panio.app)
docker compose --env-file .env.prod up -d --build
```

Fichiers concernés :
- `.env.prod` — domaines, SMTP, mots de passe MariaDB (ne pas committer)
- `docker-compose.prod.yml` — build frontend, HTTPS Traefik, volume uploads

Avant le premier déploiement :
1. DNS `panio.app` et `back.panio.app` → serveur
2. Clés JWT dans `backend/config/jwt/`
3. `MAILER_DSN` et mots de passe MariaDB renseignés dans `.env.prod`

Services Docker : `panio-mariadb`, `panio-backend`, `panio-frontend` (+ `panio-mailpit`, `panio-phpmyadmin` en dev).

## Backend (Symfony)

```bash
cd backend
composer install
cp .env .env.local   # ajuster DATABASE_URL si besoin
php bin/console lexik:jwt:generate-keypair
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
symfony server:start   # ou docker compose
```

Endpoints squelette :

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Santé de l'API |
| POST | `/api/login` | Connexion (email + password) → JWT |

## Frontend (Next.js PWA)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Variables : `NEXT_PUBLIC_API_URL` (URL de l'API Symfony).

En production, build PWA : `npm run build` puis `npm start`. Le manifest et le service worker sont générés par `@ducanh2912/next-pwa`.

Ajoutez vos icônes PWA dans `frontend/public/icons/` : `icon-192.png` et `icon-512.png`.

## Prochaines étapes

- Entités métier (panier, produit, client, distribution…)
- Écrans CRUD côté front
- Refresh token JWT si nécessaire
