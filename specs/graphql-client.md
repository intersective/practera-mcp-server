# GraphQL Client Factory

<!-- module: app/graphql-client / type: utility / status: draft -->

## Overview

This module provides a factory function and a registry of region-specific API endpoints for constructing authenticated GraphQL clients used throughout the application. It supports two authentication modes: a raw API key string and a fully configured `PracteraAuth` instance or configuration object. The `createGraphQLClient` function resolves the correct regional endpoint, normalises the authentication input into a `PracteraAuth` instance, and returns a configured `GraphQLClient` ready for use. An environment variable (`GRAPHQL_URL`) may override the local development endpoint. Unknown regions fall back to the `stage` endpoint.

## Acceptance Criteria

1. `PRACTERA_ENDPOINTS` must expose exactly five named regions: `usa`, `aus`, `euk`, `stage`, and `local`.
2. The `local` endpoint must resolve to the value of `process.env.GRAPHQL_URL` when that variable is set, and to `http://localhost:8000` otherwise.
3. `createGraphQLClient` must return a `GraphQLClient` instance configured with the endpoint that corresponds to the supplied region (case-insensitive).
4. When the supplied region does not match any known key, the client must use the `stage` endpoint.
5. When `authConfig` is a plain string, it must be treated as an API key and wrapped in a `PracteraAuth` instance with `appkey` and `accessToken` set to empty strings.
6. When `authConfig` is already a `PracteraAuth` instance, it must be used directly without re-wrapping.
7. When `authConfig` is a plain configuration object, it must be passed directly to the `PracteraAuth` constructor.
8. The `GraphQLClient` must be initialised with the headers returned by `auth.getHeaders()`.
9. No raw secret values (API keys, tokens) must appear in logs, error messages, or serialised output produced by this module.

## Scenarios

### Scenario 1: Known region resolves to correct endpoint

**Steps:**
1. Call `createGraphQLClient('test-api-key', 'aus')`.
2. Inspect the `url` property of the returned `GraphQLClient` instance.

**Expected Results:**
- The `url` property equals `https://core-graphql-api.aus.practera.com/`.

---

### Scenario 2: Region lookup is case-insensitive

**Steps:**
1. Call `createGraphQLClient('test-api-key', 'USA')`.
2. Inspect the `url` property of the returned `GraphQLClient` instance.

**Expected Results:**
- The `url` property equals `https://core-graphql-api.usa.practera.com/`.

---

### Scenario 3: Unknown region falls back to stage endpoint

**Steps:**
1. Call `createGraphQLClient('test-api-key', 'unknown-region')`.
2. Inspect the `url` property of the returned `GraphQLClient` instance.

**Expected Results:**
- The `url` property equals `https://core-graphql-api.p2-stage.practera.com/`.

---

### Scenario 4: String auth config is wrapped as API key

**Steps:**
1. Spy on the `PracteraAuth` constructor.
2. Call `createGraphQLClient('my-api-key', 'euk')`.
3. Inspect the arguments passed to the `PracteraAuth` constructor.

**Expected Results:**
- `PracteraAuth` is constructed exactly once with `{ apikey: 'my-api-key', appkey: '', accessToken: '' }`.

---

### Scenario 5: PracteraAuth instance is used directly without re-wrapping

**Steps:**
1. Construct a `PracteraAuth` instance (`authInstance`) with valid configuration.
2. Spy on the `PracteraAuth` constructor.
3. Call `createGraphQLClient(authInstance, 'usa')`.
4. Check whether the `PracteraAuth` constructor was called again.

**Expected Results:**
- The `PracteraAuth` constructor is not called a second time.
- The returned `GraphQLClient` uses the headers from `authInstance.getHeaders()`.

---

### Scenario 6: Plain config object is forwarded to PracteraAuth constructor

**Steps:**
1. Spy on the `PracteraAuth` constructor.
2. Call `createGraphQLClient({ apikey: '[REDACTED]', appkey: '[REDACTED]', accessToken: '[REDACTED]' }, 'stage')`.
3. Inspect the arguments passed to the `PracteraAuth` constructor.

**Expected Results:**
- `PracteraAuth` is constructed once with the supplied config object.

---

### Scenario 7: Local endpoint respects GRAPHQL_URL environment variable

**Steps:**
1. Set `process.env.GRAPHQL_URL` to `http://custom-local:9090`.
2. Re-import or re-evaluate `PRACTERA_ENDPOINTS` (or call `createGraphQLClient` with region `'local'`).
3. Inspect the resolved endpoint for the `local` key.

**Expected Results:**
- The endpoint for `local` equals `http://custom-local:9090`.

---

### Scenario 8: Local endpoint defaults when GRAPHQL_URL is unset

**Steps:**
1. Ensure `process.env.GRAPHQL_URL` is `undefined`.
2. Inspect `PRACTERA_ENDPOINTS.local`.

**Expected Results:**
- `PRACTERA_ENDPOINTS.local` equals `http://localhost:8000`.

---

### Scenario 9: Returned client carries authentication headers

**Steps:**
1. Create a `PracteraAuth` instance whose `getHeaders()` returns `{ Authorization: '[REDACTED]' }`.
2. Call `createGraphQLClient(authInstance, 'usa')`.
3. Inspect the `requestConfig.headers` (or equivalent internal property) of the returned `GraphQLClient`.

**Expected Results:**
- The headers object contains an `Authorization` key with the value supplied by `getHeaders()`.

## Security Notes

- API keys, OAuth access tokens, and app keys must never be logged or included in error output by this module.
- The `GRAPHQL_URL` environment variable is used only for local development; it must not be set in production environments.
- All production endpoints are HTTPS; the `local` endpoint is the only one permitted to use HTTP.
- Authentication credentials are passed exclusively via HTTP headers returned by `PracteraAuth.getHeaders()` and must not appear in the URL or query string.

## Dependencies

| Dependency | Purpose |
|---|---|
| `graphql-request` (`GraphQLClient`) | Underlying HTTP client for executing GraphQL operations |
| `../auth.js` (`PracteraAuth`) | Normalises API key and OAuth credentials into request headers |
| `process.env.GRAPHQL_URL` | Optional override for the local development GraphQL endpoint |