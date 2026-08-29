# GCP (existing):  make deploy
# Azure (parallel): make create-azure-acr | make deploy-azure
#   make deploy-azure TAG=custom-tag
#   make deploy-azure NO_CACHE=1

.PHONY: deploy deploy-azure create-azure-acr

deploy:
	@chmod +x ./deploy.sh
	@./deploy.sh

deploy-azure:
	@chmod +x ./scripts/deploy-azure.sh
	@TAG="$(TAG)" NO_CACHE="$(NO_CACHE)" ./scripts/deploy-azure.sh

create-azure-acr:
	@chmod +x ./scripts/create-azure-acr.sh
	@./scripts/create-azure-acr.sh
