# ContentGate

**A coding-agent skill for implementing and verifying server-side content
protection in an existing publishing application.**

Keep your authentication, subscription provider, CMS, and framework. ContentGate
guides your coding agent to inspect how articles reach readers, make the smallest
native changes, and leave regression tests in your application. No ContentGate
runtime dependency or AI decision on reader requests is required.

The central invariant: **verify identity and permission before retrieving or
delivering a protected article body.** Public titles, genuine editorial synopses,
and sharing metadata remain separate.

## Use the skill

The complete, portable skill is in [skills/contentgate](skills/contentgate/SKILL.md).
It contains instructions, one reference, and optional Codex UI metadata. There
are no npm dependencies or build steps.

For Codex, copy that entire folder into `.agents/skills/contentgate` in the
publisher's repository. Preserve the references and agents subdirectories.
Then invoke it in that project:

> Use $contentgate to protect our subscriber articles using our existing
> authentication and subscription checks. Preserve public metadata, fix the
> delivery paths present in this repository, and add regression tests.

For a first trial without installation, give your coding agent the path to
`skills/contentgate/SKILL.md` and ask it to read and follow the skill. Other agents
can use the same instructions; follow their own skill-discovery conventions.
Cross-agent compatibility has not been evaluated yet.

Provide repository access and the intended entitlement rules. If a CMS or CDN is
managed elsewhere, provide the relevant configuration or expect that boundary
to be reported as unverified. The skill does not supply an authentication system
or guess who should have access.

## What it guides the agent to do

1. Trace article delivery through the current application's pages, APIs, content
   loaders, framework payloads, caches, and relevant alternative routes.
2. Reuse verified identities and resource-specific entitlement checks, moving
   protected retrieval behind the permission decision.
3. Keep public metadata deliberate and protect personalized responses from shared
   caching, while preserving legitimate public content.
4. Test denied and permitted requests, provider failures, forged identities, and
   relevant alternate paths. Check zero body retrieval on denial as well as bytes
   delivered to the reader.
5. Report actual test results and external configuration still needing action.

The result is code and tests owned by the publisher. The deployed application
enforces access even when no coding agent is running. Instructions alone do not
secure a website, and a successful local run does not certify an entire deployment.

## Evaluate the skill

Three small, deliberately insecure local applications exercise different delivery
mistakes. A preparation script copies them into ignored working directories. An
agent applies the skill there; a separate grader checks observable behavior using
fixed authentication, entitlement, and content providers.

```sh
node evals/prepare.mjs my-run
# Ask an agent to follow TASK.md in each generated case using the skill.
node evals/grade.mjs test-results/skill-evals/my-run/api-order api-order
node evals/grade.mjs test-results/skill-evals/my-run/metadata-projection metadata-projection
node evals/grade.mjs test-results/skill-evals/my-run/shared-cache shared-cache
```

These tools use Node.js 22+ and no dependencies. They do not call a model or scan
live sites. See [evaluation instructions](evals/README.md) for the complete process,
coverage, and the distinction between fixture checks and actual agent evaluation.

The initial independent-agent run passed all 42 grader checks across the three
cases. Its 81 added regression tests also passed when rerun. See the
[recorded result and limitations](evals/forward-test-result.json); this is one
synthetic run, not a cross-framework reliability claim.

## Repository checks

Run the evaluation harness checks directly with Node.js 22+:

```sh
node --test evals/baseline.test.mjs
```

CI runs these checks and a fixture-preparation smoke check. It does not invoke an
AI agent; actual skill evaluation uses the separate process described above.

## Archived library

The original TypeScript library, Next.js demo, adapters, and their documentation
are preserved on the [archive/library branch](https://github.com/askpext/ContentGate/tree/archive/library).
They are not required to use or evaluate the skill.

Licensed under [MIT](LICENSE).
