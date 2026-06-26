# Auth Setup

The API owns authentication. Passwords, session tokens, verification tokens,
and reset tokens must never be stored in plain text.

## Environment Variables

Add these values to `apps/api/.env`:

```text
SESSION_SECRET=replace-with-a-random-secret
SESSION_TTL_DAYS=30
```

Generate a local secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Use a different `SESSION_SECRET` in production.

## Current Utilities

- `hashPassword(password)` stores a salted `scrypt` password hash.
- `verifyPassword(password, storedHash)` checks a plain password against the
  stored hash.
- `createSessionToken()` creates a raw session token for the browser, a hashed
  token for the database, and an expiry date.
- `hashSessionToken(token)` hashes a session token before lookup/storage.
- `isSessionExpired(expiresAt)` checks whether a session is expired.

Only the raw session token is sent to the client. Only the hashed session token
is stored in `auth_sessions`.
