# Auth Helper – Authenticated GraphQL Client Factory

<!-- module: app/auth-helper / type: utility / status: draft -->

## Overview

`createAuthenticatedClient` is a factory function that produces a pre-authenticated `GraphQLClient` instance for use with Practera's GraphQL API. It supports two authentication paths: direct API key injection and a developer login flow (`devLogin` mutation) available only in `local` and `stage` environments. The target API endpoint is resolved from a region string supplied by the caller, an environment variable (`PRACTERA_REGION`), or defaults to `local`. The returned client carries the resolved API key in its `apikey` request header, making it ready for author, student, or reviewer mutations without further configuration.

## Acceptance Criteria

1. When a valid `apikey` is provided, the function returns a `GraphQLClient` configured with that key in the `apikey` header, without performing any network mutation.
2. When no `apikey` is provided and no `email` is available (via parameter or `AUTH_EMAIL` env var), the function throws an error indicating that either an API key or email is required.
3. When no `apikey` is provided but an `email` is available, the function executes the `devLogin` mutation and uses the returned API key to construct the client.
4. When `devLogin` is attempted against a region other than `local` or `stage`, the function throws an error indicating that an API key is required for production regions.
5. When `devLogin` returns a response that does not contain an `apikey`, the function throws an error identifying the email for which login failed.
6. The resolved endpoint is determined by the `region` parameter, falling back to `PRACTERA_REGION` env var, then to `local`.

## Scenarios

### Scenario 1: Successful client creation with an explicit API key

**Steps:**
1. Call `createAuthenticatedClient({ apikey: '<REDACTED>', region: 'local' })`.
2. Await the returned promise.

**Expected Results:**
- The promise resolves to a `GraphQLClient` instance.
- The client's request headers contain the key `apikey` set to the provided (redacted) value.
- No outbound HTTP/GraphQL request is made during construction.

---

### Scenario 2: Successful devLogin flow in the `local` environment

**Steps:**
1. Ensure no `apikey` is provided.
2. Call `createAuthenticatedClient({ email: 'dev@example.com', region: 'local' })`.
3. The mock GraphQL server at the `local` endpoint receives a `devLogin` mutation with variable `email: "dev@example.com"` and responds with `{ devLogin: { apikey: '<REDACTED>', email: 'dev@example.com', unregistered: false } }`.
4. Await the returned promise.

**Expected Results:**
- Exactly one POST request is made to the `local` endpoint containing the `devLogin` mutation.
- The promise resolves to a `GraphQLClient` instance.
- The client's request headers contain the key `apikey` set to the value returned by the mock server.

---

### Scenario 3: Successful devLogin flow in the `stage` environment

**Steps:**
1. Ensure no `apikey` is provided.
2. Call `createAuthenticatedClient({ email: 'dev@example.com', region: 'stage' })`.
3. The mock GraphQL server at the `stage` endpoint responds with a valid `devLogin` payload containing an `apikey`.
4. Await the returned promise.

**Expected Results:**
- The promise resolves to a `GraphQLClient` instance configured with the `stage` endpoint.
- The client's request headers contain the `apikey` returned by the mock server.

---

### Scenario 4: Error when neither API key nor email is supplied

**Steps:**
1. Ensure `AUTH_EMAIL` environment variable is unset.
2. Call `createAuthenticatedClient({ region: 'local' })` with no `apikey` and no `email`.
3. Await the returned promise.

**Expected Results:**
- The promise rejects with an `Error`.
- The error message contains the text `"Either apikey or email (for devLogin) is required"`.

---

### Scenario 5: Error when devLogin is attempted against a production region

**Steps:**
1. Ensure no `apikey` is provided.
2. Call `createAuthenticatedClient({ email: 'dev@example.com', region: 'us' })` (or any region that is not `local` or `stage`).
3. Await the returned promise.

**Expected Results:**
- The promise rejects with an `Error`.
- The error message contains the text `"devLogin is only available for local/stage environments"`.
- No outbound HTTP/GraphQL request is made.

---

### Scenario 6: Error when devLogin mutation returns no API key

**Steps:**
1. Ensure no `apikey` is provided.
2. Call `createAuthenticatedClient({ email: 'unknown@example.com', region: 'local' })`.
3. The mock GraphQL server responds with `{ devLogin: { apikey: null, email: 'unknown@example.com', unregistered: true } }`.
4. Await the returned promise.

**Expected Results:**
- The promise rejects with an `Error`.
- The error message contains the text `"devLogin failed for unknown@example.com"`.

---

### Scenario 7: Region defaults to `local` when no region is specified and `PRACTERA_REGION` is unset

**Steps:**
1. Ensure `PRACTERA_REGION` environment variable is unset.
2. Call `createAuthenticatedClient({ apikey: '<REDACTED>' })` with no `region` parameter.
3. Await the returned promise.

**Expected Results:**
- The promise resolves to a `GraphQLClient` instance.
- The client is configured with the endpoint corresponding to the `local` region as defined in `PRACTERA_ENDPOINTS`.

---

### Scenario 8: Region is resolved from the `PRACTERA_REGION` environment variable when not passed as a parameter

**Steps:**
1. Set `PRACTERA_REGION` environment variable to `stage`.
2. Call `createAuthenticatedClient({ apikey: '<REDACTED>' })` with no `region` parameter.
3. Await the returned promise.

**Expected Results:**
- The promise resolves to a `GraphQLClient` instance.
- The client is configured with the endpoint corresponding to the `stage` region as defined in `PRACTERA_ENDPOINTS`.

## Security Notes

- API key values passed via `apikey` parameter or returned by `devLogin` must never be logged, stored in plain text, or exposed in error messages.
- The `devLogin` mutation is explicitly restricted to `local` and `stage` environments; any attempt to use it against other regions is rejected before a network call is made.
- API keys are transmitted as HTTP headers; callers must ensure the underlying transport uses TLS in non-local environments.
- Secret values (API keys, credentials) are redacted in this specification and must not appear in test fixtures, logs, or CI output.

## Dependencies

- `graphql-request` – provides the `GraphQLClient` class used to construct authenticated clients and execute the `devLogin` mutation.
- `./graphql-client.js` – exports the `PRACTERA_ENDPOINTS` map that resolves region strings to API endpoint URLs.
- `PRACTERA_REGION` environment variable – optional; used as a fallback region when none is supplied by the caller.
- `AUTH_EMAIL` environment variable – optional; used as a fallback email for the `devLogin` flow when none is supplied by the caller.