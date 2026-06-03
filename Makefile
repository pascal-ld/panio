# Panio — commandes Docker (prod par défaut)
#
# Usage sur le VPS :
#   Créez .env.prod sur le serveur (voir README), puis :
#   make init                        # premier déploiement
#   make deploy                      # après un git pull
#
# Dev local :
#   make dev-up

ENV_FILE ?= .env.prod
COMPOSE  := docker compose --env-file $(ENV_FILE)
BACKEND  := panio-backend
DB       := panio-mariadb

.PHONY: help check-env init deploy update up down restart build pull ps logs \
        logs-backend logs-frontend logs-db migrate migrate-status cache-clear cache-warm \
        console health shell-backend shell-db dev-up dev-down dev-logs

help: ## Affiche cette aide
	@echo "Panio — cibles disponibles ($(ENV_FILE)) :"
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

check-env: ## Vérifie que le fichier d'environnement existe
	@test -f $(ENV_FILE) || (echo "Fichier $(ENV_FILE) introuvable. Créez-le sur le serveur (voir README)." && exit 1)

init: check-env build up migrate cache-warm ## Premier déploiement (build + migrations)
	@echo "Init terminé. Vérifiez : make health"

deploy: check-env pull build up migrate cache-warm ## Déploiement complet (git pull + build + migrations)
	@echo "Déploiement terminé."

update: check-env build up migrate cache-warm ## Redéploie sans git pull
	@echo "Mise à jour terminée."

pull: ## Récupère la dernière version Git
	git pull --ff-only

up: check-env ## Démarre les services (build les images locales si besoin)
	$(COMPOSE) up -d --build

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

health: check-env ## Teste l'endpoint /api/health
	@url=$$(grep '^BACKEND_URL=' $(ENV_FILE) | cut -d= -f2-); \
	test -n "$$url" || (echo "BACKEND_URL introuvable dans $(ENV_FILE)" && exit 1); \
	echo "GET $$url/api/health"; \
	curl -fsS "$$url/api/health" && echo

shell-backend: check-env ## Shell dans le conteneur backend
	$(COMPOSE) exec $(BACKEND) bash

shell-db: check-env ## Client MariaDB
	$(COMPOSE) exec $(DB) mariadb -u$$(grep '^MYSQL_USER=' $(ENV_FILE) | cut -d= -f2) -p$$(grep '^MYSQL_PASSWORD=' $(ENV_FILE) | cut -d= -f2) $$(grep '^MYSQL_DATABASE=' $(ENV_FILE) | cut -d= -f2)

# --- Dev local ---

dev-up: ## Démarre l'environnement de dev (.env)
	$(MAKE) up ENV_FILE=.env

dev-down: ## Arrête l'environnement de dev
	$(MAKE) down ENV_FILE=.env

dev-logs: ## Logs dev
	$(MAKE) logs ENV_FILE=.env
