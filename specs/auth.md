# Authentication Module

<!-- module: app/auth / type: middleware-and-helper / status: draft -->

## Overview

The authentication module provides the `PracteraAuth` class and the `requireAuth` Express middleware for authenticating requests to the Practera API. It supports two authentication methods: OAuth Bearer tokens and API keys, both encoded as JWTs. The `PracteraAuth` class decodes JWT claims on construction, exposes `timelineId` and `role` properties derived from the API key payload, and generates appropriate request headers for downstream GraphQL calls. The `requireAuth` middleware enforces authentication on Express routes, attaching verified JWT claims to the request object before passing control to the next handler.

## Acceptance Criteria

1. `PracteraAuth` MUST throw an error if neither `apikey` nor `accessToken` is supplied at construction time.
2. When constructed with an `apikey`, `PracteraAuth` MUST decode the JWT and populate `timelineId` and `role` from the `timeline_id` and `role` claims respectively; `role` defaults to `"none"` when the claim is absent.
3. `getHeaders()` MUST return an `Authorization: Bearer <token>` header and an `appkey` header when an `accessToken` is present, regardless of whether an `apikey` is also present.
4. `getHeaders()` MUST return `apikey`, `appkey`, and `timelineId` headers when only an `apikey` is present.
5. `getHeaders()` MUST throw an error when called on an instance that has no `apikey` and no `accessToken`.
6. `PracteraAuth.verifyToken()` MUST throw an error when the JWT `exp` claim is in the past.
7. `PracteraAuth.verifyApikey()` MUST throw an error when the decoded `role` claim does not match the expected `role` argument.
8. `PracteraAuth.fromHeaders()` MUST prefer a `Bearer` token in the `Authorization` header over an API key header.
9. `PracteraAuth.fromHeaders()` MUST throw an error when neither a Bearer token nor an API key header is present.
10. `requireAuth` middleware MUST respond with HTTP 401 when no valid credentials are present.
11. `requireAuth` middleware MUST attach decoded claims to `req.user` on successful authentication.
12. `requireAuth` middleware MUST respect the `allowOAuth` and `allowApikey` options, skipping the corresponding auth method when set to `false`.

## Scenarios

### Scenario 1: Successful construction with an API key JWT

**Steps:**
1. Call `new PracteraAuth({ apikey: '<valid-jwt-with-timeline_id-and-role-claims>' })`.
2. Read the `timelineId` and `role` properties of the returned instance.

**Expected Results:**
- The instance is created without throwing.
- `timelineId` equals the `timeline_id` claim value from the JWT.
- `role` equals the `role` claim value from the JWT.

---

### Scenario 2: Construction fails when no credentials are provided

**Steps:**
1. Call `new PracteraAuth({})` with an empty configuration object.

**Expected Results:**
- An `Error` is thrown with a message containing `"Either apikey or accessToken is required for authentication"`.

---

### Scenario 3: `getHeaders()` returns OAuth headers when accessToken is set

**Steps:**
1. Construct `new PracteraAuth({ accessToken: '<redacted-token>', appkey: 'my-app' })`.
2. Call `instance.getHeaders()`.

**Expected Results:**
- The returned object contains `Authorization` equal to `"Bearer <redacted-token>"`.
- The returned object contains `appkey` equal to `"my-app"`.
- The returned object does NOT contain an `apikey` key.

---

### Scenario 4: `getHeaders()` returns API key headers when only apikey is set

**Steps:**
1. Construct `new PracteraAuth({ apikey: '<valid-jwt>', appkey: 'my-app' })`.
2. Call `instance.getHeaders()`.

**Expected Results:**
- The returned object contains `apikey` equal to the supplied JWT value.
- The returned object contains `appkey` equal to `"my-app"`.
- The returned object contains `timelineId` equal to the `timeline_id` claim decoded from the JWT (or an empty string if absent).
- The returned object does NOT contain an `Authorization` key.

---

### Scenario 5: `verifyToken()` rejects an expired JWT

**Steps:**
1. Construct a JWT whose `exp` claim is set to a Unix timestamp in the past.
2. Call `PracteraAuth.verifyToken('<expired-jwt>')`.

**Expected Results:**
- The returned promise rejects with an `Error`.
- The error message contains `"Token expired"` or `"Authentication failed"`.

---

### Scenario 6: `verifyApikey()` rejects a JWT with a mismatched role

**Steps:**
1. Construct a valid, non-expired JWT with `role` claim set to `"participant"`.
2. Call `PracteraAuth.verifyApikey('<jwt>', 'admin')`.

**Expected Results:**
- The returned promise rejects with an `Error`.
- The error message contains `"Unauthorized"` or `"Authentication failed"`.

---

### Scenario 7: `fromHeaders()` extracts a Bearer token

**Steps:**
1. Call `PracteraAuth.fromHeaders({ Authorization: 'Bearer <redacted-token>' })`.

**Expected Results:**
- A `PracteraAuth` instance is returned without throwing.
- Calling `getHeaders()` on the instance returns an `Authorization` header starting with `"Bearer "`.

---

### Scenario 8: `fromHeaders()` throws when no credentials are present

**Steps:**
1. Call `PracteraAuth.fromHeaders({})` with an empty headers object.

**Expected Results:**
- An `Error` is thrown with a message containing `"No authentication credentials found in headers"`.

---

### Scenario 9: `requireAuth` middleware passes a valid Bearer token request

**Steps:**
1. Mount `requireAuth({ allowOAuth: true, allowApikey: false })` on a test Express route.
2. Send a GET request to that route with the header `Authorization: Bearer <valid-non-expired-jwt>`.
3. Observe the response status and the value of `req.user` inside the route handler.

**Expected Results:**
- The middleware calls `next()` and does not send a response itself.
- `req.user` is populated with the decoded JWT claims object.
- The route handler receives the request and can respond with HTTP 200.

---

### Scenario 10: `requireAuth` middleware returns 401 when no credentials are provided

**Steps:**
1. Mount `requireAuth()` on a test Express route.
2. Send a GET request to that route with no `Authorization` header and no `apikey` or `x-api-key` header.
3. Observe the HTTP response.

**Expected Results:**
- The response status code is `401`.
- The response body is a JSON object containing an `error` property with a value starting with `"Unauthorized"`.

---

### Scenario 11: `requireAuth` middleware returns 401 when OAuth is disabled and a Bearer token is supplied

**Steps:**
1. Mount `requireAuth({ allowOAuth: false, allowApikey: false })` on a test Express route.
2. Send a GET request with the header `Authorization: Bearer <valid-jwt>`.
3. Observe the HTTP response.

**Expected Results:**
- The response status code is `401`.
- The response body contains an `error` property.

## Security Notes

- Raw credential values (API keys, access tokens) MUST NOT be logged or reproduced in error messages or spec documents; they are redacted throughout this specification.
- JWT expiration (`exp` claim) is checked in both `verifyToken()` and `verifyApikey()`; tokens past their expiry are rejected.
- `verifyApikey()` enforces a role check when a `role` argument is supplied; the middleware currently hard-codes the expected role as `"admin"`.
- `fromHeaders()` and `requireAuth` both check `x-api-key` as a fallback header name for API key delivery.
- No cryptographic signature verification of JWTs is performed in the current implementation; `decodeJwt` only decodes without verifying the signature. This is noted as a placeholder in the source and represents a known security gap.

## Dependencies

| Dependency | Purpose |
|---|---|
| `jose` (`decodeJwt`) | JWT decoding (no signature verification) |
| `express` (`Request`, `Response`, `NextFunction`) | Middleware type contracts |