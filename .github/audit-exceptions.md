# Dependency audit exceptions

`pnpm audit --prod` must report nothing (CI enforces it). Development-only advisories without a
published fix are listed here, reviewed with each Dependabot update.

| Package | Advisory | Where | Why accepted | Review |
| --- | --- | --- | --- | --- |
| braces 3.0.3 | stack exhaustion on crafted brace patterns | `@custom-elements-manifest/analyzer` → `chokidar` 3 (build-time manifest generation only) | No patched 3.x is published; the analyzer only reads this repository's own source files, never user input. Nothing ships to npm users. | Remove when the analyzer moves to chokidar 4 or braces publishes a fix. |
