# Deployment Guide

This guide covers how to deploy Soroban CrashLab to production. The dashboard can be deployed on Vercel for free, or run in a Docker container for self hosted setups.

---

## Deploy to Vercel

Vercel is the recommended hosting platform for the web dashboard. The free tier is sufficient for most use cases.

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click Add New and select Project
3. Import your Soroban CrashLab repository
4. Vercel auto detects Next.js. The default settings work.

### Step 3: Configure Environment Variables

Add these environment variables in the Vercel project settings.

| Variable | Value | Purpose |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_MOCK_DATA` | `true` | Enables mock data until backend is ready |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain | Used for server side URL generation |

### Step 4: Deploy

Click Deploy. Your dashboard will be live in about two minutes.

### Step 5: Connect a Custom Domain (Optional)

In the Vercel project settings, go to Domains and add your custom domain. Vercel provisions an SSL certificate automatically.

---

## Docker Deployment

A Dockerfile is included for containerized deployments.

### Build the Image

```bash
docker compose build web-prod
```

### Run the Container

```bash
docker compose --profile prod up web-prod
```

The dashboard will be available at http://localhost:3000.

### Docker Compose Profiles

The project includes several Docker Compose profiles for different scenarios.

| Profile | Command | What It Starts |
|---|---|---|
| Default | `docker compose up web` | Development server with hot reload |
| Production | `docker compose --profile prod up web-prod` | Production optimized build |
| Core | `docker compose --profile core build core` | Rust fuzzing engine build |

---

## Environment Variables

The application uses environment variables for configuration. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in your values.

### Required Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_MOCK_DATA` | Use mock data when no backend is available | `true` |

### Optional Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL for real fuzzing data | Empty (uses mock data) |
| `NEXT_PUBLIC_APP_URL` | Application URL for server side operations | Auto detected |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking | Empty (Sentry disabled) |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Stellar network to target | `testnet` |
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed contract ID | Empty |
| `CRASHLAB_ARTIFACT_DIR` | Directory for storing run artifacts | System temp directory |

---

## Production Checklist

Before deploying to production, verify these items.

- [ ] All environment variables are configured in the hosting platform
- [ ] `NEXT_PUBLIC_ENABLE_MOCK_DATA` is set to `false` when a real backend is connected
- [ ] The application builds with zero errors: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] Lint passes with zero errors: `npm run lint`
- [ ] The vercel.json file is present if deploying to Vercel
- [ ] A custom domain is configured if needed
- [ ] SSL certificate is active

---

## CI/CD Pipeline

The project includes GitHub Actions workflows that run on every push and pull request.

**The CI workflow** has six jobs that run in parallel where possible.

| Job | What It Does | Run Time |
|---|---|---|
| web | Lints, tests, and builds the web dashboard | About 2 minutes |
| core | Runs Rust tests for the fuzzing engine | About 3 minutes |
| soroban example | Tests and builds the example contract | About 4 minutes |
| secrets scan | Scans for leaked credentials | About 1 minute |
| scripts syntax | Validates shell script syntax | About 30 seconds |
| e2e | Runs Playwright end to end tests | About 3 minutes |

**Other workflows**

| Workflow | Schedule | Purpose |
|---|---|---|
| Stale issue management | Daily | Marks inactive issues as stale |
| Backlog freshness | Weekly | Reviews and updates the issue backlog |

---

## Monitoring

Once deployed, you can monitor the dashboard through these channels.

- **Vercel Analytics** provides real time traffic and performance data if enabled
- **Sentry integration** captures JavaScript errors from the dashboard
- **Playwright test reports** from CI show E2E test results
- **GitHub Actions logs** show build and deployment status
