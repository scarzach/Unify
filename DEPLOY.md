# Deploying Unify on Your Own Server

The easiest path for this repo is:

- push to a private GitHub repo
- clone it onto your server
- run the app and PostgreSQL with Docker Compose
- put Nginx in front of the app
- add free SSL with Let's Encrypt

## What You Need

- A Linux server, usually Ubuntu
- A domain name pointed at that server
- Docker and Docker Compose
- Nginx

Unify stores uploaded sharing files on local disk in `uploads/`, so that folder must persist across deploys.

## How To Get the Project Onto the Server

If the project only exists on your computer, there are two normal ways to move it to the server.

### Option 1: Push to GitHub/Gitea, then clone on the server

This is the best long-term option and the one this guide assumes.

1. Create a private GitHub repo.
2. From your local machine:

```bash
git init
git add .
git commit -m "Initial Unify deploy"
git branch -M main
git remote add origin git@github.com:your-user/unify.git
git push -u origin main
```

3. On the server:

```bash
git clone git@github.com:your-user/unify.git /srv/unify
cd /srv/unify
```

### Option 2: Copy the local project directly to the server

This is fine if you are not using Git hosting yet.

From your local machine:

```bash
rsync -av --exclude node_modules --exclude .next --exclude .env --exclude uploads ./ user@your-server:/srv/unify
```

You can also use `scp`, but `rsync` is better for repeated deploys.

## Server Setup

Install the runtime packages:

```bash
sudo apt update
sudo apt install -y nginx docker.io docker-compose-plugin
```

Create the app directory:

```bash
sudo mkdir -p /srv/unify
sudo chown -R $USER:$USER /srv/unify
```

## Environment File

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

Example production values:

```env
AUTH_SECRET="generate-a-long-random-secret"
NEXTAUTH_URL="https://your-domain.com"
NODE_ENV="production"
PORT="3000"
POSTGRES_USER="unify_user"
POSTGRES_PASSWORD="strong_password"
POSTGRES_DB="unify_db"
```

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

## Start the Full Stack with Docker

This repo now includes:

- `Dockerfile`
- `docker-compose.prod.yml`

Create the uploads directory once:

```bash
mkdir -p uploads
```

Then build and start both the database and the app:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

What this does:

- starts PostgreSQL in one container
- builds and starts the Next.js app in another container
- injects a container-safe `DATABASE_URL` that points at the `db` service
- runs `npx prisma migrate deploy` automatically before the app starts
- keeps `uploads/` mounted from the host so shared files survive rebuilds

Important:

- do not use `localhost` in the production `DATABASE_URL` for the app container
- inside Docker Compose, the Postgres host is `db`
- if you keep a `DATABASE_URL` line in `.env`, make sure it also uses `@db:5432`, not `@localhost:5432`

## Put Nginx in Front

Copy the example config:

```bash
sudo cp nginx-unify.conf /etc/nginx/sites-available/unify
sudo ln -s /etc/nginx/sites-available/unify /etc/nginx/sites-enabled/unify
sudo nginx -t
sudo systemctl reload nginx
```

Edit `server_name` in `nginx-unify.conf` first.

This config proxies traffic to the Docker app container on `127.0.0.1:3000`.

## Add Free SSL

Use Let's Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

That is free.

## Updating the App Later

If using Git:

```bash
cd /srv/unify
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

If using `rsync`:

```bash
rsync -av --exclude node_modules --exclude .next --exclude .env --exclude uploads ./ user@your-server:/srv/unify
ssh user@your-server
cd /srv/unify
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

If you need to see logs:

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f db
```

If you need to stop the stack:

```bash
docker compose -f docker-compose.prod.yml down
```

## Backups You Should Care About

At minimum back up:

- PostgreSQL data
- `uploads/`
- `.env`

If you lose `uploads/`, shared files are gone even if the database still has the metadata.

## Cheapest Realistic Hosting Model

If you want this effectively "for free", the usual meaning is:

- use a VPS you already pay for or a low-cost one
- use Docker/Postgres/Nginx/Let's Encrypt at no extra software cost
- do not use paid managed DB or file storage yet

There is no serious zero-cost always-on server hosting that is better than just running this on your own box.

## Optional Non-Docker App Runtime

There is still a `unify.service` file in the repo if you ever want to run the app directly with Node and keep only PostgreSQL in Docker, but the main supported path is now Docker Compose for both app and database.
