# Search Utilities

<!-- module: app/search-utils / type: utility-library / status: draft -->

## Overview

The search utilities module (`src/libs/search-utils.ts`) provides a set of functions for advanced skill matching used across the application's search features. It implements a lightweight word stemmer, a file-backed skill thesaurus loader with in-memory caching, a reverse thesaurus index builder, and a multi-strategy skill-match predicate. The module is designed to be consumed server-side and relies on a JSON thesaurus file located at `../data/skill-thesaurus.json` relative to the compiled output. When the thesaurus file cannot be read, all thesaurus-dependent operations degrade gracefully by treating the thesaurus as empty.

## Acceptance Criteria

- AC-1: `stemWord` must convert a word to lowercase, trim whitespace, and strip the suffixes `ing`, `ation→ate`, `s`, `ed`, `ies→y`, and `ment` in that order.
- AC-2: `loadSkillThesaurus` must read and parse `skill-thesaurus.json`; on any file-system or parse error it must return an empty object `{}` without throwing.
- AC-3: `getSkillThesaurus` must return the cached thesaurus on subsequent calls without performing additional file reads.
- AC-4: `buildReverseThesaurusIndex` must map every synonym (lowercased) to its canonical skill key (lowercased), and must also map each canonical key to itself.
- AC-5: `isSkillMatch` must evaluate matches in priority order: exact → contains → stem → thesaurus; it must return `true` on the first match found.
- AC-6: `isSkillMatch` must return `false` when no strategy produces a match.
- AC-7: `isSkillMatch` must not throw when the thesaurus lookup fails; it must log the error and return `false`.

## Scenarios

### Scenario 1: Exact skill match

**Steps:**
1. Call `isSkillMatch("Python", "python")`.

**Expected Results:**
- The function resolves to `true`.

---

### Scenario 2: Contains match (skill contains search term)

**Steps:**
1. Call `isSkillMatch("JavaScript", "java")`.

**Expected Results:**
- The function resolves to `true`.

---

### Scenario 3: Contains match (search term contains skill)

**Steps:**
1. Call `isSkillMatch("SQL", "MySQL SQL")`.

**Expected Results:**
- The function resolves to `true`.

---

### Scenario 4: Stem match on common suffix

**Steps:**
1. Call `isSkillMatch("managing", "management")`.

**Expected Results:**
- Both words are stemmed (`manag` and `manag`), producing a stem-level contains match.
- The function resolves to `true`.

---

### Scenario 5: Thesaurus synonym match

**Steps:**
1. Ensure `skill-thesaurus.json` contains an entry where canonical key `"javascript"` lists `"js"` as a synonym.
2. Call `isSkillMatch("JavaScript", "js")`.

**Expected Results:**
- The reverse index maps `"js"` → `["javascript"]`.
- The function resolves to `true`.

---

### Scenario 6: No match found

**Steps:**
1. Call `isSkillMatch("Python", "Rust")` with a thesaurus that contains no relationship between the two terms.

**Expected Results:**
- The function resolves to `false`.

---

### Scenario 7: Thesaurus file missing — graceful degradation

**Steps:**
1. Remove or rename `skill-thesaurus.json` so it is unreadable.
2. Call `loadSkillThesaurus()`.

**Expected Results:**
- The function resolves to `{}` (empty object).
- An error message is written to `console.error`; no exception is propagated to the caller.

---

### Scenario 8: Thesaurus cache prevents repeated file reads

**Steps:**
1. Call `getSkillThesaurus()` once, allowing the file to be read and cached.
2. Spy on `fs.promises.readFile`.
3. Call `getSkillThesaurus()` a second time.

**Expected Results:**
- `fs.promises.readFile` is called exactly once across both invocations.
- Both calls return the same thesaurus object reference.

---

### Scenario 9: Reverse index maps canonical key to itself

**Steps:**
1. Load a thesaurus containing `{ "TypeScript": ["ts", "tsc"] }`.
2. Call `buildReverseThesaurusIndex()`.

**Expected Results:**
- The returned index contains `"typescript"` → array including `"typescript"`.
- The returned index contains `"ts"` → array including `"typescript"`.
- The returned index contains `"tsc"` → array including `"typescript"`.

---

### Scenario 10: `stemWord` suffix stripping order

**Steps:**
1. Call `stemWord("  Managing  ")`.
2. Call `stemWord("creation")`.
3. Call `stemWord("ries")`.
4. Call `stemWord("management")`.

**Expected Results:**
- `"  Managing  "` → `"manag"` (trimmed, lowercased, `ing` removed).
- `"creation"` → `"create"` (`ation` → `ate`).
- `"ries"` → `"ry"` (`ies` → `y`).
- `"management"` → `"manag"` (`ment` removed, then `s` rule does not apply).

## Security Notes

- The thesaurus file path is resolved at module load time using `path.resolve`; ensure the `../data/skill-thesaurus.json` file is not writable by untrusted processes to prevent data injection into skill matching results.
- No user-supplied input is used to construct file-system paths, eliminating path-traversal risk within this module.
- No secrets, API keys, or credentials are present in this module.

## Dependencies

| Dependency | Purpose |
|---|---|
| Node.js built-in `fs` (promises API) | Reading the thesaurus JSON file from disk |
| Node.js built-in `path` | Resolving the absolute path to the thesaurus file |
| Node.js built-in `url` (`fileURLToPath`) | Converting ESM `import.meta.url` to a file-system path |
| `../data/skill-thesaurus.json` | External data file mapping canonical skill names to synonym arrays |