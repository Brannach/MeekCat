# MeekCat — Deployment Guide

How MeekCat gets from your laptop to the public internet, end to end. Most of
this is **one-time setup**; once it's done, deploying a new version is just a
`git push` to `main`.

---

## Architecture at a glance

```
git push main
      │
      ▼
GitHub Actions (.github/workflows/ci.yml)
  1. test    → builds the client + runs Playwright
  2. docker  → builds the Docker image, pushes it to GHCR
  3. deploy  → tells Azure to roll the Container App to the new image
      │
      ▼
GHCR (ghcr.io/<you>/meekcat)  ──pull──►  Azure Container Apps  ──►  public URL
   (free public registry)                  (free monthly grant)
```

- **Image registry:** GitHub Container Registry (GHCR) — free for public images.
- **Host:** Azure Container Apps, consumption plan, scale-to-zero — stays inside
  the free monthly grant for low traffic.
- **Live URL:** https://meekcat.livelysky-e7562e25.brazilsouth.azurecontainerapps.io

### Resource names used throughout

| Thing                  | Value                          |
|------------------------|--------------------------------|
| Resource group         | `meekcat-rg`                   |
| Container Apps env      | `meekcat-env`                  |
| Container App          | `meekcat`                      |
| Region                 | `brazilsouth`                  |
| Container port         | `3000` (matches `EXPOSE` / server `PORT`) |
| Image                  | `ghcr.io/<your-username>/meekcat` |

Replace `<your-username>` (and any `<...>` placeholder) with your real values.

---

## Part 1 — Create an Azure account

You only do this once.

1. Go to **https://azure.microsoft.com** and click **Start free**.
2. **Sign in with your existing Microsoft account** (the free credit is
   one-per-customer; an account tied to a previous trial may be ineligible).
3. Fill in your profile. **Country/Region can't be changed later**, so choose
   carefully.
4. **Verify by phone** (code via SMS or call).
5. **Verify by card.** A credit/debit card is required for identity
   verification — it is **not** billed during the free period, and a *free*
   account does **not** auto-convert to paid. Some prepaid/virtual cards are
   rejected; a normal credit or debit card is safest.
6. Accept the agreement and click **Sign up**.

What you get: **$200 credit for 30 days**, **12 months free** of selected
services, and **65+ always-free** services.

> **Gotcha — Brazilian CEP:** the address form rejects the dotted format
> (`90.470-440`). Use `90470-440` (no dot) or `90470440` (digits only), and make
> sure **Country/Region is set to Brazil first** so the postal-code validation
> uses the right pattern.

---

## Part 2 — Install the Azure CLI and sign in

1. Install the CLI (Windows):

   ```
   winget install -e --id Microsoft.AzureCLI
   ```

   (Or the MSI: https://aka.ms/installazurecliwindows)

2. **Open a new terminal** so `az` is picked up on your PATH, then sign in:

   ```
   az login
   ```

   This opens a browser; sign in with the same Microsoft account.

3. Confirm the right subscription is active:

   ```
   az account show
   ```

> **Gotcha — `az` not found:** if you installed the CLI while a terminal (or an
> IDE like Rider with an embedded terminal) was already open, that terminal has a
> stale PATH. Open a fresh standalone terminal, or fully quit and reopen the IDE.

---

## Part 3 — CI builds and pushes the image to GHCR

This is handled by the `docker` job in `.github/workflows/ci.yml`. The job logs
in to GHCR with the built-in `GITHUB_TOKEN`, normalizes the image name to
lowercase (GHCR requires it; GitHub usernames may contain capitals), and pushes
two tags: `:latest` and the commit `:<sha>`.

```yaml
  docker:
    name: Build & push Docker image
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write          # lets GITHUB_TOKEN push to GHCR
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Compute lowercase image name
        run: echo "IMAGE=ghcr.io/${GITHUB_REPOSITORY,,}" >> "$GITHUB_ENV"

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGE }}:latest
            ${{ env.IMAGE }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

> **Gotcha — Tailwind in the Docker build:** the client's `vite.config.js`
> imports `@tailwindcss/vite`, so `tailwindcss` and `@tailwindcss/vite` must be
> declared in **`client/package.json`** (not just the root). Otherwise the
> isolated Docker build stage can't resolve them and `npm run build` fails.
> After adding them, run `npm install --prefix client` and commit the updated
> `client/package-lock.json`.

---

## Part 4 — Make the GHCR package public

New GHCR packages are **private** by default; Azure Container Apps pulls the
image anonymously, so it must be public.

1. On GitHub: your profile → **Packages** → click the package (named after the repo).
2. **Package settings** → **Change visibility** → **Public** → confirm.
3. Note the exact image path shown — e.g. `ghcr.io/<your-username>/meekcat`.

---

## Part 5 — First deploy to Azure Container Apps

One-time provider/extension setup:

```
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

Wait until registration finishes (a minute or two):

```
az provider show -n Microsoft.App --query registrationState -o tsv
```

Create the resources:

```
az group create --name meekcat-rg --location brazilsouth

az containerapp env create --name meekcat-env --resource-group meekcat-rg --location brazilsouth
```

Create the app from your public image (substitute your image path):

```
az containerapp create --name meekcat --resource-group meekcat-rg --environment meekcat-env --image ghcr.io/<your-username>/meekcat:latest --target-port 3000 --ingress external --min-replicas 0 --max-replicas 1 --query properties.configuration.ingress.fqdn -o tsv
```

That prints the public URL. Flags that matter:

- `--target-port 3000` — matches the Dockerfile's `EXPOSE 3000`.
- `--ingress external` — exposes it to the internet.
- `--min-replicas 0` — scales to zero when idle (free when no traffic; the
  tradeoff is a short cold start on the first request after idle).

---

## Part 6 — Continuous deployment (auto-redeploy on push to `main`)

Goal: every push to `main` rebuilds the image and rolls the Container App to it,
automatically. GitHub authenticates to Azure with **OIDC** (a short-lived token,
no stored password).

### 6a. Create an identity for GitHub to use

```
az ad app create --display-name "meekcat-github-deploy" --query appId -o tsv
```

Copy the printed **APP_ID**, then:

```
az ad sp create --id <APP_ID>
az account show --query id -o tsv         # this is SUB_ID
az account show --query tenantId -o tsv   # this is TENANT_ID
```

Grant it Contributor on just the resource group:

```
az role assignment create --assignee <APP_ID> --role Contributor --scope /subscriptions/<SUB_ID>/resourceGroups/meekcat-rg
```

### 6b. Add the federated credential

Easiest via the Portal (the subject string is strict and easy to mistype):

Entra admin center → **App registrations** → **meekcat-github-deploy** →
**Certificates & secrets** → **Federated credentials** → **Add credential** →
scenario **"GitHub Actions deploying Azure resources"** → set Organization =
your GitHub username, Repository = your repo, Entity = **Branch**, Branch =
**main** → **Add**.

CLI alternative — create `cred.json`:

```json
{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:<owner>/<repo>:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
```

```
az ad app federated-credential create --id <APP_ID> --parameters cred.json
```

(`<owner>/<repo>` must match your GitHub URL's exact casing.)

### 6c. Add GitHub repository secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret name             | Value          |
|-------------------------|----------------|
| `AZURE_CLIENT_ID`       | the APP_ID     |
| `AZURE_TENANT_ID`       | the TENANT_ID  |
| `AZURE_SUBSCRIPTION_ID` | the SUB_ID     |

### 6d. Add the `deploy` job to `.github/workflows/ci.yml`

Append as a fourth job (same indentation as `test` and `docker`, under `jobs:`):

```yaml
  deploy:
    name: Deploy to Azure Container Apps
    runs-on: ubuntu-latest
    needs: docker
    if: github.event_name == 'push'
    permissions:
      id-token: write          # required for the OIDC handshake
      contents: read
    steps:
      - name: Log in to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Update Container App to the new image
        run: |
          az config set extension.use_dynamic_install=yes_without_prompt
          az extension add --name containerapp --upgrade
          IMAGE=ghcr.io/${GITHUB_REPOSITORY,,}:${GITHUB_SHA}
          az containerapp update --name meekcat --resource-group meekcat-rg --image "$IMAGE"
```

`needs: docker` makes deploy wait for the image to be published, and it pins the
update to the exact `:<commit-sha>` build (not a moving `:latest`).

After this is in place: **push to `main` → test → docker → deploy → live** in a
couple of minutes.

---

## Everyday operations

Ship a new version (with CD set up):

```
git push origin main      # the pipeline does the rest
```

Manual update to a specific build:

```
az containerapp update --name meekcat --resource-group meekcat-rg --image ghcr.io/<your-username>/meekcat:<sha>
```

See revisions / which one is live:

```
az containerapp revision list -g meekcat-rg -n meekcat -o table
```

Stream logs:

```
az containerapp logs show -g meekcat-rg -n meekcat --follow
```

Tear everything down (removes all resources in one shot):

```
az group delete --name meekcat-rg --yes --no-wait
```

---

## Cost summary

| Item                                   | Cost                                            |
|----------------------------------------|-------------------------------------------------|
| GitHub Actions                         | Free (public repo; 2,000 min/mo free if private)|
| GHCR (public image)                    | Free                                            |
| Azure Container Apps (scale-to-zero)   | Free within the monthly grant for low traffic   |
| Entra app / SP / federated cred / RBAC | Free                                            |
| Deployments / new revisions            | Free (no per-deploy charge)                     |

Default **single-revision mode** means each deploy replaces the previous
revision, so you don't pay for multiple running copies.

> ⚠️ Avoid **Azure Container Registry (ACR)** for the free goal — even its Basic
> tier (~$5/mo) has no free allowance. That's why this setup uses GHCR instead.

---

## Troubleshooting quick reference

| Symptom                                              | Fix                                                                 |
|------------------------------------------------------|---------------------------------------------------------------------|
| CEP rejected during Azure sign-up                    | Use `90470-440` (no dot); set Country = Brazil first                 |
| `az` not found after install                         | Open a fresh terminal / restart the IDE (stale PATH)                 |
| Docker build fails at `RUN npm run build`            | Add `tailwindcss` + `@tailwindcss/vite` to `client/package.json`    |
| GHCR push returns 403                                | Ensure `permissions: packages: write` on the `docker` job           |
| Container App won't pull the image                   | Make the GHCR package **Public**                                     |
| `azure/login` fails in CI                            | Ensure `permissions: id-token: write` and the federated subject matches `repo:<owner>/<repo>:ref:refs/heads/main` |
