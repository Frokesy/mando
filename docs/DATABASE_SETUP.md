# Development Database Setup

Mando uses PostgreSQL through Drizzle ORM. Neon is the development database
host because it provides standard PostgreSQL connection strings and can later
scale without changing the application's database layer.

## 1. Create a Neon Account

1. Open `https://console.neon.tech/signup` in a browser.
2. Sign up with GitHub, Google, or email.
3. Choose the Free plan.

The database account is separate from VS Code and the Mando application.

## 2. Create the Project

1. Create a Neon project named `mando`.
2. Choose the region closest to the application's primary users.
3. Keep the generated PostgreSQL version and compute settings.
4. Finish creating the project.

Neon creates a default production branch and database during onboarding.

## 3. Create a Development Branch

1. Open **Branches** in the Neon project.
2. Select **Create branch**.
3. Name it `development`.
4. Use the default production branch as its parent.
5. Create the branch.

We will use `development` while building so schema work is isolated from the
future production database.

## 4. Copy the Connection String

1. Open the project dashboard and click **Connect**.
2. Select the `development` branch.
3. Keep the default database and role.
4. Leave **Connection pooling** enabled.
5. Copy the complete PostgreSQL connection string.

It resembles this:

```text
postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DATABASE?sslmode=verify-full
```

The real string contains a password. Do not paste it into chat, documentation,
source code, or any committed file.

## 5. Add the Local Environment File

Inside `apps/api`, create a file named `.env`. Start with the values from
`.env.example` and replace only `DATABASE_URL` with the connection string:

```dotenv
API_HOST=127.0.0.1
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://YOUR_REAL_NEON_CONNECTION_STRING
```

The repository ignores `.env` files, so this secret stays on the local
machine.

## 6. Test the Connection

From the repository root, run:

```powershell
npm run db:check
```

A successful result names the connected database and prints its current
server time. This command does not create, edit, or delete any tables.

## Optional: View Neon in VS Code

Neon's official VS Code extension can browse schemas and run queries from the
editor. It is optional; Drizzle and the API do not depend on it.

1. Open the VS Code Extensions panel.
2. Search for the official **Neon** extension.
3. Install it and sign in to the same Neon account.
4. Select the `mando` project and `development` branch.

Use the extension for inspection. Schema changes should still be made through
reviewed Drizzle migrations so the database history remains in Git.
