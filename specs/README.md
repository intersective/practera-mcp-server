# Living Specifications

This directory holds SpecGuard's Living Specifications — the source of truth
for each module's behavior. One spec file per module, mirroring your source
layout.

## Format

Each spec is Markdown with a metadata comment block and these sections:

```markdown
# <Module Title>

<!--
  module: src/path/to/module.ts
  type: core | pipeline | adapter | cli
  status: draft | stable
-->

## Overview
## Acceptance Criteria
## Scenarios
## Security Notes
## Dependencies
```

## Workflow

- `specguard reverse --app <name>` — generate specs from existing source
- `specguard generate --all` — generate tests from specs
- `specguard validate --all` — run specs against the running app
- `specguard status` — report spec coverage
