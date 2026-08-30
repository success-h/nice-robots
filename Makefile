# GCP (existing):  make deploy
# Azure:
#   make azure-login          # once per machine / until token expires
#   make create-azure-acr     # once
#   make deploy-azure
#   make deploy-azure TAG=x NO_CACHE=1

.PHONY: deploy deploy-azure create-azure-acr azure-login

deploy:
	@chmod +x ./deploy.sh
	@./deploy.sh

azure-login:
	@chmod +x ./scripts/azure-login.sh
	@./scripts/azure-login.sh

deploy-azure:
	@chmod +x ./scripts/deploy-azure.sh ./scripts/_azure_common.sh
	@TAG="$(TAG)" NO_CACHE="$(NO_CACHE)" ./scripts/deploy-azure.sh

create-azure-acr:
	@chmod +x ./scripts/create-azure-acr.sh ./scripts/_azure_common.sh
	@./scripts/create-azure-acr.sh
