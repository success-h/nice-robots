# Azure deploy — frontend (`nice-robots`)

**Deploy the backend first.** Full sequential guide:

→ **`nice-robots-api/docs/deploy-azure.md`** (Part A, then Part B).

---

## Prerequisites

- Docker Desktop running (`docker version`)
- Azure CLI + Container Apps extension (`az extension add --name containerapp --upgrade`)
- Git, Make
- Backend Container App `nicerobotsapi` already up, and you know its FQDN

You do not need interactive browser `az login` if `.env.deploy` has the service principal *(ask Tima)*.

**ACR:** this app uses **`nicerobotsfeacr`** — never Aisha `aishacr`, never the API registry `nicerobotsapiacr`.

---

## Commands (in order)

```bash
git clone <GITHUB_URL_OF_NICE_ROBOTS>
cd nice-robots

cp .env.deploy.example .env.deploy
```

Edit `.env.deploy`:

```bash
export AZURE_TENANT_ID=...          # ask Tima (same as API)
export AZURE_CLIENT_ID=...
export AZURE_CLIENT_SECRET=...
export AZURE_SUBSCRIPTION_ID=...

# Point at Azure API (replace API_FQDN from backend deploy):
export NEXT_PUBLIC_GOOGLE_CLIENT_ID=...                    # ask Tima
export NEXT_PUBLIC_BACKEND_URL=https://API_FQDN/api
export NEXT_PUBLIC_WS_URL=wss://API_FQDN/socket
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...              # ask Tima
```

```bash
make create-azure-acr    # once → nicerobotsfeacr
make deploy-azure
```

Get the frontend URL:

```bash
az containerapp show \
  --name nicerobotsfe \
  --resource-group aisharg \
  --query "properties.configuration.ingress.fqdn" \
  -o tsv
```

Later updates:

```bash
make deploy-azure
# or: make deploy-azure NO_CACHE=1
```

---

## Notes

- GCP path remains `make deploy` — do not mix with Azure.
- `NEXT_PUBLIC_*` are **build-time**; if the API URL changes, update `.env.deploy` and run `make deploy-azure` again.
- Do not commit `.env.deploy`.
