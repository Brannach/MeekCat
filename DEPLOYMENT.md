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
GHCR (ghcr.io/<you>/meekcat)
   (free public image registry)
      │
      ▼ pull
Azure Container Apps                ──libSQL──►  Turso  (free SQLite cloud)
   (free monthly grant; scale-to-zero)             persistent across deploys
      │
      ▼
  public URL
```

- **Image registry:** GitHub Container Registry (GHCR) — free for public images.
- **Host:** Azure Container Apps, consumption plan, scale-to-zero — stays inside
  the free monthly grant for low traffic.
- **Database:** Turso (libSQL / SQLite-compatible) on its free Starter plan —
  data lives outside the deploy cycle so redeploys don't wipe it.
- **Live URL:** https://meekcat.livelysky-e7562e25.brazilsouth.azurecontainerapps.io

### Resource names used throughout

| Thing                    | Value                                                |
|--------------------------|------------------------------------------------------|
| Resource group           | `meekcat-rg`                                         |
| Container Apps env       | `meekcat-env`                                        |
| Container App            | `meekcat`                                            |
| Region                   | `brazilsouth`                                        |
| Container port           | `3000` (matches `EXPOSE` / server `PORT`)            |
| Image                    | `ghcr.io/<your-username>/meekcat`                    |
| Turso database URL       | `libsql://<dbname>-<your-username>.<region>.turso.io`|
| Container Apps secret    | `database-auth-token`                                |

Replace `<your-username>` and any `<...>` placeholder with your real values.

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

> **Gotcha — `@libsql/client` native build in Docker:** the libSQL client has a
> small native component. The Dockerfile uses `node:20-bookworm-slim` (glibc) for
> the server-deps and runtime stages, and installs `python3 make g++` in the
> server-deps stage so `node-gyp` can compile from source when a prebuilt
> binary isn't available. Build tools live only in the build stage; the final
> runtime image stays slim.

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

At this point the live app runs against an in-container SQLite file that resets
on every deploy. Part 7 wires it to Turso so the data actually survives.

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

## Part 7 — Persistence via Turso

Azure Container Apps' filesystem is **ephemeral** — every new revision (every
push to `main`) ships a fresh container with no carryover of disk state. Without
an external store, every deploy wipes the DB. We use **Turso** — a free
SQLite-compatible cloud DB — to hold the live app's data outside the deploy
cycle. Azure Files volumes would also work, but they're not on the free tier;
Turso is.

### 7a. Sign up for Turso and create a database

1. Go to **https://turso.tech** and sign up (GitHub login is fastest; no card
   required).
2. From the dashboard, **Create Database** → pick **"New Database"** (the
   "Upload SQLite File" tab would import your local DB *including the seed data*,
   which is the opposite of what we want in production). Name it `meekcatdb`
   (or anything; you'll reference it via URL). For the region, pick the closest
   to your Container App — for `brazilsouth`, an East-US region (`aws-us-east-1`)
   is the closest free option.
3. After creation, copy the **Database URL**. It looks like:

   ```
   libsql://meekcatdb-<your-username>.<region>.turso.io
   ```

### 7b. Generate a database token

> **Critical gotcha — there are two distinct token types in Turso.**
> **API tokens** authenticate against the management API (creating DBs,
> listing groups, billing); they are **rejected** when used as a connection auth
> header. **Database tokens** (or group tokens) authenticate libSQL client
> connections to a specific DB — this is what `@libsql/client` needs. Using the
> wrong type gives a `LibsqlError: SERVER_ERROR: Server returned HTTP status 401`
> that looks identical to a wrong-value bug.

In the Turso dashboard, navigate to the **specific database** you just created
(not a global tokens page). Open its token management → **Create Token** with a
long expiry → copy the full `ey...` JWT.

### 7c. Store the token as a Container Apps secret

Container Apps has a built-in secret store; the token lives there encrypted and
is referenced (not duplicated) in the env vars. Easiest path is the Portal:

**meekcat** Container App → **Settings** → **Secrets** → **Add** → name
`database-auth-token`, value `<paste your token>`. Make sure no whitespace or
newline crept in (paste via Notepad++ first if you copied from a long-wrapping
UI element).

CLI alternative, capturing the token into a PowerShell variable to dodge any
shell-quoting pitfalls:

```powershell
$token = "<paste your token between these quotes>"
az containerapp secret set --name meekcat --resource-group meekcat-rg --secrets "database-auth-token=$token"
```

### 7d. Wire the env vars

The app reads two env vars: `DATABASE_URL` (plain value, fine in cleartext) and
`DATABASE_AUTH_TOKEN` (pulls from the secret store via Container Apps'
`secretref:` syntax). The prefix tells Container Apps to dereference the named
secret at container startup:

```
az containerapp update --name meekcat --resource-group meekcat-rg --set-env-vars "DATABASE_URL=libsql://meekcatdb-<your-username>.<region>.turso.io" "DATABASE_AUTH_TOKEN=secretref:database-auth-token"
```

This creates a new revision. Wait ~30 seconds, then verify:

```
az containerapp revision list -g meekcat-rg -n meekcat -o table
```

The new revision should come up `Healthy / Provisioned`. Open the live URL —
Board and Roadmap should load empty (fresh Turso DB with just the schema we
create on startup; no seed in production).

### 7e. Verify persistence end-to-end

1. Add a task on the Board called something memorable like "Survives deploy".
2. Trigger a full pipeline rebuild + redeploy:

   ```
   git commit --allow-empty -m "verify persistence"
   git push origin main
   ```

3. Wait for the Actions run to go green, then reload the live URL. The task
   should still be there. That's the entire persistence loop closed: new
   container, new revision, new image SHA, same data.

Optional victory lap: in the Turso dashboard, open the DB's SQL shell and run
`SELECT * FROM board_tasks;`. You should see your row with its `created_at`
timestamp. The DB lives outside the deploy cycle entirely now.

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

Stream logs (live tail; falls back to historical via the Portal if no replica is running):

```
az containerapp logs show -g meekcat-rg -n meekcat --follow
```

Rotate the Turso token (re-set the secret; new revisions pick up the new value):

```powershell
$token = "<paste new token>"
az containerapp secret set --name meekcat --resource-group meekcat-rg --secrets "database-auth-token=$token"
az containerapp update --name meekcat --resource-group meekcat-rg --revision-suffix tokenrotate
```

Tear everything down (removes all Azure resources in one shot):

```
az group delete --name meekcat-rg --yes --no-wait
```

(Turso lives outside Azure; delete the DB from the Turso dashboard separately if you also want to tear that down.)

---

## Cost summary

| Item                                   | Cost                                            |
|----------------------------------------|-------------------------------------------------|
| GitHub Actions                         | Free (public repo; 2,000 min/mo free if private)|
| GHCR (public image)                    | Free                                            |
| Azure Container Apps (scale-to-zero)   | Free within the monthly grant for low traffic   |
| Turso (Starter plan)                   | Free — 500 DBs, 5 GB, 1B reads/month, no card   |
| Entra app / SP / federated cred / RBAC | Free                                            |
| Deployments / new revisions            | Free (no per-deploy charge)                     |

Default **single-revision mode** means each deploy replaces the previous
revision, so you don't pay for multiple running copies.

> ⚠️ Avoid **Azure Container Registry (ACR)** and **Azure Files** if your goal
> is $0. ACR's Basic tier (~$5/mo) has no free allowance, and Azure Files
> mounts on Container Apps require Standard storage with its own per-GB cost.
> That's why this setup uses GHCR for images and Turso for data instead.

---

## Troubleshooting quick reference

| Symptom                                              | Fix                                                                 |
|------------------------------------------------------|---------------------------------------------------------------------|
| CEP rejected during Azure sign-up                    | Use `90470-440` (no dot); set Country = Brazil first                 |
| `az` not found after install                         | Open a fresh terminal / restart the IDE (stale PATH)                 |
| Docker build fails at `RUN npm run build`            | Add `tailwindcss` + `@tailwindcss/vite` to `client/package.json`    |
| Docker build fails on `prebuild-install` (better-sqlite3 / libsql) | Use `node:20-bookworm-slim` (glibc) for the server stages and install `python3 make g++` in the build stage so `node-gyp` can compile from source. |
| GHCR push returns 403                                | Ensure `permissions: packages: write` on the `docker` job           |
| Container App won't pull the image                   | Make the GHCR package **Public**                                     |
| `azure/login` fails in CI                            | Ensure `permissions: id-token: write` and the federated subject matches `repo:<owner>/<repo>:ref:refs/heads/main` |
| `AADSTS70025: ... has no configured federated identity credentials` | The app registration has **no** federated credential — add one (Part 6b). Confirm with `az ad app federated-credential list --id <APP_ID> -o table`. |
| `AADSTS700213: No matching federated identity record` | A credential exists but the subject doesn't match. It's **case-sensitive** — use your repo's exact casing (e.g. `repo:Brannach/MeekCat:ref:refs/heads/main`, from the Actions log). |
| `LibsqlError: SERVER_ERROR: Server returned HTTP status 401` from Turso | The auth token is wrong. The most common cause is using an **API token** instead of a **database token** — only the latter authorizes libSQL connections. Generate a new DB-scoped token from the Turso dashboard's per-DB token settings, paste it via `az containerapp secret set "database-auth-token=$token"`, and force a new revision. |
| Container env shows `DATABASE_AUTH_TOKEN` with `value: secretref:database-auth-token` instead of `secretRef: database-auth-token` | The `secretref:` prefix didn't get interpreted as a secret reference — the env var contains the literal string. Re-run `az containerapp update --set-env-vars "DATABASE_AUTH_TOKEN=secretref:database-auth-token"` with explicit quotes; the correct shape (camelCase, no `value:` field) shows up in `az containerapp show ... --query "properties.template.containers[0].env"`. |
