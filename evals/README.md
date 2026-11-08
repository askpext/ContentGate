# ContentGate skill evaluations

The apps under `fixtures/` are deliberately insecure, synthetic inputs for a
coding agent. They are not deployment examples. Each uses the same fixed dummy
providers, native Request/Response, and no external services or dependencies.

| Case | Delivery paths | What the evaluation exercises |
| --- | --- | --- |
| api-order | API, metadata | Retrieval ordering, forged identity, missing content |
| metadata-projection | API, metadata | Public-field projection, separation of loaders, sanitized failures |
| shared-cache | API, metadata, HTML, CMS route | Shared render cache, response headers, alternate route enforcement |

## Prepare a run

From the repository root, with Node.js 22+:

```sh
node evals/prepare.mjs run-01
```

This creates `test-results/skill-evals/run-01/` with three isolated cases, each
containing `app.mjs`, `providers.mjs`, and `TASK.md`. Existing run directories are
never overwritten. The output stays out of version control.

Give an independent coding agent the skill directory and one generated case's
`TASK.md`. A fresh context per case is preferable for comparing versions. Do not
give it the grader or this table of expected mistakes. Allow edits and local tests
only inside that case, with no network, deployment, or dependency installation.
Do not let it modify the fixed `providers.mjs`. Capture its changed files, tests,
and final explanation. A direct skill invocation tests execution, not automatic
skill selection; evaluate discovery separately if needed.

## Grade the result

After the agent finishes:

```sh
node evals/grade.mjs test-results/skill-evals/run-01/api-order api-order
node evals/grade.mjs test-results/skill-evals/run-01/metadata-projection metadata-projection
node evals/grade.mjs test-results/skill-evals/run-01/shared-cache shared-cache
```

The grader executes the local synthetic code. Run only trusted evaluation copies
in your permitted development environment, not arbitrary downloaded projects.
Each case outputs JSON results and exits nonzero on any failure. Inspect the
agent's patch as well: hardcoding fixture credentials/content or bypassing provider
functions is not a valid solution even if a subset of tests passes.

Checks include denied readers with zero body reads, current and expired
entitlements, article-specific denial, forged identity, auth/policy failure,
permitted delivery, missing resources, malformed IDs, metadata integrity, and
concurrent readers. The cache case additionally checks complete HTML responses
without executing JavaScript, both cache-order sequences, and the direct CMS path.
It requires existing routes and approved-reader access to continue working.

Also review whether the agent added useful regression tests, preserved the
providers, avoided a runtime dependency, and stated the limits of its evidence.
The grader checks behavior, not the wording of the agent's report.

## What CI does and does not establish

`npm test` runs deterministic baseline checks that prove the grader catches the
seeded defects and that each fixture can serve an authorized reader. CI does not
invoke an AI agent and does not claim the unmodified fixtures pass protection
checks. These tests are a guard against broken evaluation machinery.

An actual forward test requires the separate agent step above. Record the skill
version, agent/model if known, results, and observed limitations when reporting it.
A single successful run is initial evidence, not a reliability estimate across
frameworks or models. These small apps do not exercise real WordPress, Next.js
RSC, remote CDNs, deployment credentials, automatic skill selection, or live CMS
configuration. The existing Next.js reference tests cover that reference's local
delivery behavior; they do not prove the skill can repair every Next.js project.
