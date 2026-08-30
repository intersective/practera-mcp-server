# Project Brief Service

<!-- module: app/project-brief-service / type: service / status: draft -->

## Overview

The Project Brief Service loads, stores, and retrieves structured project brief records from a JSON file on disk. It exposes methods to search briefs by skill — prioritising exact matches over partial matches — and to retrieve all briefs up to a configurable limit. Skill matching is delegated to the `isSkillMatch` utility, which applies techniques such as thesaurus lookup and stemming. The service initialises lazily on first use and is exported as a singleton instance. On file-load failure the service degrades gracefully by operating with an empty brief collection.

## Acceptance Criteria

1. The service reads project briefs from the configured JSON file path (`PROJECT_BRIEFS_PATH` by default) exactly once, regardless of how many methods are called.
2. If the JSON file cannot be read or parsed, the service initialises with an empty array and does not throw to the caller.
3. `searchBySkill(skill, limit)` returns at most `limit` results (default 5), with exact-matched briefs appearing before partial-matched briefs.
4. A brief is included in search results if `isSkillMatch` returns `true` for any entry in `technical_skills_required` or `professional_skills_required`; each brief appears at most once per result set.
5. `getAllBriefs(limit)` returns at most `limit` briefs (default 10) in their original file order.
6. The `ProjectBrief` interface requires all documented fields; records missing required fields are not validated by the service itself (parsing is delegated to `JSON.parse`).

## Scenarios

### Scenario 1: Successful initialisation from file

**Steps:**
1. Instantiate `ProjectBriefService` with a path pointing to a valid JSON file containing an array of two `ProjectBrief` objects.
2. Call `getAllBriefs()`.

**Expected Results:**
- The file is read exactly once during the lifetime of the instance.
- The returned array contains exactly 2 `ProjectBrief` objects matching the file contents.
- A console log message is emitted containing the count (2) and the file path.

---

### Scenario 2: Initialisation failure falls back to empty collection

**Steps:**
1. Instantiate `ProjectBriefService` with a path that does not exist on disk.
2. Call `getAllBriefs()`.

**Expected Results:**
- No exception is thrown from `getAllBriefs()`.
- The returned array is empty (`[]`).
- A console error message is emitted referencing the load failure.
- Subsequent calls to any method do not attempt to re-read the file.

---

### Scenario 3: Lazy initialisation — file is read only once across multiple calls

**Steps:**
1. Instantiate `ProjectBriefService` with a valid JSON file path.
2. Call `getAllBriefs()`.
3. Call `searchBySkill('Python')`.
4. Call `getAllBriefs()` again.

**Expected Results:**
- The underlying `fs.promises.readFile` is invoked exactly once across all three calls.

---

### Scenario 4: `searchBySkill` returns exact matches before partial matches

**Steps:**
1. Load a service instance with briefs where Brief A has `technical_skills_required: ['Python']` and Brief B has `technical_skills_required: ['python scripting']`.
2. Configure `isSkillMatch` so that `('Python', 'Python')` returns `true` for exact mode and `('python scripting', 'Python')` returns `true` for partial mode only.
3. Call `searchBySkill('Python', 5)`.

**Expected Results:**
- The returned array contains Brief A at index 0 and Brief B at index 1.
- The total result count is 2.

---

### Scenario 5: `searchBySkill` respects the `limit` parameter

**Steps:**
1. Load a service instance with 10 briefs, each having `technical_skills_required: ['JavaScript']`.
2. Configure `isSkillMatch` to return `true` for all comparisons with `'JavaScript'`.
3. Call `searchBySkill('JavaScript', 3)`.

**Expected Results:**
- The returned array contains exactly 3 briefs.

---

### Scenario 6: A brief matching on professional skill is included in results

**Steps:**
1. Load a service instance with one brief where `technical_skills_required: []` and `professional_skills_required: ['stakeholder management']`.
2. Configure `isSkillMatch` to return `true` for `('stakeholder management', 'stakeholder management')`.
3. Call `searchBySkill('stakeholder management', 5)`.

**Expected Results:**
- The returned array contains the brief.
- The brief appears exactly once in the result.

---

### Scenario 7: A brief matching on both technical and professional skills appears only once

**Steps:**
1. Load a service instance with one brief where `technical_skills_required: ['SQL']` and `professional_skills_required: ['SQL reporting']`.
2. Configure `isSkillMatch` to return `true` for both skill entries against the query `'SQL'`.
3. Call `searchBySkill('SQL', 5)`.

**Expected Results:**
- The returned array contains the brief exactly once.

---

### Scenario 8: `getAllBriefs` respects the default limit of 10

**Steps:**
1. Load a service instance with a JSON file containing 15 `ProjectBrief` objects.
2. Call `getAllBriefs()` without arguments.

**Expected Results:**
- The returned array contains exactly 10 briefs.
- The briefs are in the same order as they appear in the source file.

---

### Scenario 9: Singleton export is a `ProjectBriefService` instance

**Steps:**
1. Import `projectBriefService` from the module.
2. Check its constructor name and verify it exposes `searchBySkill` and `getAllBriefs` methods.

**Expected Results:**
- `projectBriefService` is an instance of `ProjectBriefService`.
- Both `searchBySkill` and `getAllBriefs` are callable functions on the instance.

## Security Notes

- The data file path is resolved at construction time; callers providing a custom `dataPath` should ensure the path is validated and restricted to trusted directories to prevent path-traversal reads.
- No secret values, API keys, or credentials are present in this module.
- File contents are passed directly to `JSON.parse` without schema validation; malformed or malicious JSON will cause a caught error and an empty collection, but consumers should not rely on the parsed data being structurally correct without additional validation.

## Dependencies

| Dependency | Role |
|---|---|
| `fs` (Node.js built-in) | Reads the project briefs JSON file from disk |
| `PROJECT_BRIEFS_PATH` (`./data-paths.js`) | Provides the default file path for the briefs data file |
| `isSkillMatch` (`./search-utils.js`) | Performs skill comparison with thesaurus/stemming support for both exact and partial matching |