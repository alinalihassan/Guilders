# Stable dev tunnel for provider webhooks

Provider callbacks (Teller, EnableBanking, GoCardless) need a public HTTPS URL. Using a **persistent Cloudflare Tunnel** gives you one URL that never changes, so you set it once in each provider dashboard and reuse it.

**Why a stable URL?** Most providers (Teller, EnableBanking, etc.) require you to register the webhook or callback URL in their dashboard. With a randomly generated URL (e.g. from `cloudflared tunnel --url http://localhost:3000`), you’d have to update that URL in each dashboard every time the tunnel restarts. **GoCardless is the exception**: it supports setting a custom redirect/callback origin at runtime, so a changing URL is less of an issue there.

## Prerequisites

- A domain on Cloudflare (e.g. `guilders.app`). Add the site in the Cloudflare dashboard and use Cloudflare nameservers.
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed (`brew install cloudflared` on macOS).

## One-time setup

### 1. Log in and create a tunnel

```bash
cloudflared tunnel login
```

Pick the zone (e.g. `guilders.app`) when the browser opens.

```bash
cloudflared tunnel create guilders-dev
```

Note the tunnel **UUID** and the path to the credentials file (e.g. `~/.cloudflared/<UUID>.json`).

### 2. Route a hostname to the tunnel

Choose a subdomain (e.g. `dev-api.guilders.app`). Then:

```bash
cloudflared tunnel route dns guilders-dev dev-api.guilders.app
```

This creates a CNAME for `dev-api.guilders.app` pointing at the tunnel.

### 3. Configure the tunnel

Create `~/.cloudflared/config.yml` with the following (use `~` so the credentials path works on any machine):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: dev-api.guilders.app
    service: http://localhost:3000
  - service: http_status:404
```

Then:

- Replace both `<TUNNEL_ID>` placeholders with your tunnel UUID from step 1.
- Change `dev-api.guilders.app` to your chosen hostname if different.
- Ensure the `service` port matches your dev server (default `3000` for `bun run dev` / wrangler).

### 4. Set your stable URL in the app

In `apps/api/.env`:

```env
NGROK_URL=https://dev-api.guilders.app
```

Use the same hostname you used in step 2. You can keep the variable name; it’s used as the dev callback base URL for all providers.

### 5. Register the URL with each provider

In each provider’s dashboard (Teller, EnableBanking, GoCardless), set the webhook/callback URL to your stable base URL, e.g.:

- `https://dev-api.guilders.app/api/connections/callback/...` (or whatever paths they use)

You only do this once; the URL does not change when you restart the tunnel.

## Daily use

1. Start your API: `bun run dev` (or `wrangler dev`) in `apps/api`.
2. Start the tunnel: `cloudflared tunnel run guilders-dev` (or run it with `--config ~/.cloudflared/config.yml` if needed).

Leave the tunnel running while you develop. Traffic to `https://dev-api.guilders.app` is forwarded to `http://localhost:3000`.

## Optional: run tunnel from the repo

If your config is at `~/.cloudflared/config.yml` and the tunnel is named `guilders-dev`:

```bash
cloudflared tunnel run guilders-dev
```

Or add a script in `apps/api/package.json`:

```json
"tunnel:cf": "cloudflared tunnel run guilders-dev"
```

Run it in a separate terminal from `bun run dev`.
