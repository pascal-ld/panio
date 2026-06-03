# Panio — commandes Docker (prod par défaut)
#
# Production (VPS) :
#   cp .env.prod.example .env.prod && cp backend/.env.prod.example backend/.env.prod
#   make init
#
# Dev local :
#   cp .env.example .env && make dev-up

ENV_FILE ?= .env.prod
COMPOSE  := docker compose --env-file $(ENV_FILE)
BACKEND  := panio-backend
DB       := panio-mariadb

.PHONY: help check-env init deploy update up rebuild down restart build pull ps logs \
        logs-backend logs-frontend logs-db migrate migrate-status cache-clear cache-warm \
        console health health-local shell-backend shell-db dev-up dev-down dev-logs

help: ## Affiche cette aide
	@echo "Panio — cibles disponibles ($(ENV_FILE)) :"
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

check-env: ## Vérifie que le fichier d'environnement existe
	@test -f $(ENV_FILE) || (echo "Fichier $(ENV_FILE) introuvable. Copiez .env.prod.example vers .env.prod" && exit 1)
	@test -f backend/.env.prod || (echo "Fichier backend/.env.prod introuvable. Copiez backend/.env.prod.example" && exit 1)

init: check-env build up migrate cache-warm ## Premier déploiement (build + migrations)
	@echo "Init terminé. Vérifiez : make health"

deploy: check-env pull build up migrate cache-warm ## Déploiement complet (git pull + build + migrations)
	@echo "Déploiement terminé."

update: check-env build up migrate cache-warm ## Redéploie sans git pull
	@echo "Mise à jour terminée."

pull: ## Récupère la dernière version Git
	git pull --ff-only

up: check-env ## Démarre les services (build + recrée les conteneurs app)
	$(COMPOSE) up -d --build --force-recreate $(BACKEND) panio-frontend

rebuild: check-env ## Rebuild sans cache + recréation (après git pull ou si le build semble obsolète)
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d --force-recreate $(BACKEND) panio-frontend

down: check-env ## Arrête les services
	$(COMPOSE) down

restart: check-env ## Redémarre les services
	$(COMPOSE) restart

build: check-env ## Reconstruit les images
	$(COMPOSE) build

ps: check-env ## État des conteneurs
	$(COMPOSE) ps

logs: check-env ## Logs de tous les services (Ctrl+C pour quitter)
	$(COMPOSE) logs -f --tail=100

logs-backend: check-env ## Logs backend
	$(COMPOSE) logs -f --tail=100 $(BACKEND)

logs-frontend: check-env ## Logs frontend
	$(COMPOSE) logs -f --tail=100 panio-frontend

logs-db: check-env ## Logs MariaDB
	$(COMPOSE) logs -f --tail=100 $(DB)

migrate: check-env ## Exécute les migrations Doctrine
	$(COMPOSE) exec -T $(BACKEND) php bin/console doctrine:migrations:migrate --no-interaction

migrate-status: check-env ## Statut des migrations
	$(COMPOSE) exec -T $(BACKEND) php bin/console doctrine:migrations:status

cache-clear: check-env ## Vide le cache Symfony
	$(COMPOSE) exec -T $(BACKEND) php bin/console cache:clear

cache-warm: check-env ## Préchauffe le cache Symfony (prod)
	$(COMPOSE) exec -T $(BACKEND) php bin/console cache:warmup

console: check-env ## Commande Symfony (ex. make console CMD="debug:router")
	@test -n "$(CMD)" || (echo 'Usage: make console CMD="debug:router"' && exit 1)
	$(COMPOSE) exec -T $(BACKEND) php bin/console $(CMD)

health: check-env ## Teste /api/health via Traefik (BACKEND_URL dans .env.prod)
	@url=$$(grep '^BACKEND_URL=' $(ENV_FILE) | sed 's/^BACKEND_URL=//' | tr -d '\r"' | xargs); \
	test -n "$$url" || (echo "BACKEND_URL introuvable dans $(ENV_FILE)" && exit 1); \
	case "$$url" in http://*|https://*) ;; *) url="https://$$url" ;; esac; \
	url=$${url%/}; \
	echo "GET $$url/api/health"; \
	curl -fsS -k "$$url/api/health" && echo

health-local: check-env ## Teste /api/health dans le conteneur backend (sans Traefik)
	@echo "GET http://localhost/api/health (dans panio-backend)"
	@$(COMPOSE) exec -T $(BACKEND) curl -fsS http://localhost/api/health && echo

shell-backend: check-env ## Shell dans le conteneur backend
	$(COMPOSE) exec $(BACKEND) bash

shell-db: check-env ## Client MariaDB (utilise MYSQL_* du conteneur)
	$(COMPOSE) exec $(DB) sh -c 'mariadb -u"$$MYSQL_USER" -p"$$MYSQL_PASSWORD" "$$MYSQL_DATABASE"'

# --- Dev local ---

dev-up: ## Démarre l'environnement de dev (.env)
	$(MAKE) up ENV_FILE=.env

dev-down: ## Arrête l'environnement de dev
	$(MAKE) down ENV_FILE=.env

dev-logs: ## Logs dev
	$(MAKE) logs ENV_FILE=.env
