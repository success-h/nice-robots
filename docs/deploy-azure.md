# Azure deploy — frontend cheat sheet

Full copy-paste guide (backend + frontend):  
→ **`nice-robots-api/docs/deploy-azure.md`**

## Sequence (frontend only, after API is live)

```bash
git clone <GITHUB_URL_OF_NICE_ROBOTS>
cd nice-robots
git checkout deployAzure

cp .env.deploy.example .env.deploy
# fill AZURE_* (ask Tima) and:
#   NEXT_PUBLIC_BACKEND_URL=https://API_FQDN/api
#   NEXT_PUBLIC_WS_URL=wss://API_FQDN/socket
#   NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
#   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

make azure-login          # once; skip if already logged in
make create-azure-acr     # once → nicerobotsfeacr (NOT aishacr)
make deploy-azure

az containerapp show \
  --name nicerobotsfe \
  --resource-group aisharg \
  --query "properties.configuration.ingress.fqdn" \
  -o tsv
```

Later:

```bash
make azure-login   # only if az auth expired
make deploy-azure
```

Docker must be running. Do not use `make deploy` (GCP).
