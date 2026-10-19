# ASVAB Tutoring – Beta

Beta version of the ASVAB Tutoring website — **https://beta.asvab-tutoring.com**.
Cloned from the live site (www.asvab-tutoring.com) to build and test new features safely.

## Stack
- Next.js (App Router, standalone output) + React + TypeScript
- React Bootstrap
- Square Web Payments
- Data from the PHP API on [staging-test-prep.asvab-tutoring](https://github.com/sharminislamshroddha/staging-test-prep.asvab-tutoring)

## Environments
| | Live | Beta |
|---|---|---|
| URL | www.asvab-tutoring.com | beta.asvab-tutoring.com |
| Server folder | `kzbesluikq` | `nwnmfyndne` |
| PM2 process | `asvab-tutoring` | `asvab-tutoring-beta` |
| Port | 3000 | 3001 |
| PHP API | test-prep.asvab-tutoring.com | staging-test-prep.asvab-tutoring.com |

> ⚠️ Square is configured with **production** keys — payments on beta are real charges.

## How it runs
Cloudways serves `index.php`, which reverse-proxies requests to the Next.js server on `127.0.0.1:3001` (managed by PM2 via `ecosystem.config.js`).

## Structure
| Path | Purpose |
|---|---|
| `app/` | Pages and API routes |
| `components/` | Shared UI components |
| `lib/`, `utils/`, `types/` | Helpers and types |
| `middleware/`, `middleware.ts` | Request middleware (referral tracking, host redirects) |
| `public/` | Static assets |

## Deploy
```bash
bash deploy.sh                 # npm install + build + restart
bash deploy-no-npm-isntall.sh  # build + restart (skip npm install)
```
Environment variables live in `.env.local` (not committed).

## Local development
```bash
npm install
npm run dev
```
