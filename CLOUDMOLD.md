# CloudMold DataHub Distribution

`CloudMold/cloudmold-datahub` is CloudMold's governed DataHub distribution. It keeps the
official GitHub fork relationship with `datahub-project/datahub` while allowing CloudMold to
develop metadata catalog, knowledge-library, Skill, Agent, R2, authorization, and operations
capabilities on an independent product line.

## Authority boundaries

- Upstream DataHub remains the authority for the generic metadata platform and public APIs.
- `cloudmold/main` is the authority for CloudMold-specific integration and product behavior.
- CloudMold Knowledge Registry remains the authority for document lifecycle, quality, Corpus
  Release, Tombstone, citation, and purge approval.
- DataHub search, graph, and UI are rebuildable projections; they do not replace Registry state.

## Remotes

| Remote | Purpose | Push policy |
|---|---|---|
| `origin` | `CloudMold/cloudmold-datahub` | default and only normal push target |
| `upstream` | `datahub-project/datahub` | fetch only |
| `personal` | `karekin/datahub` | historical fallback, fetch only |

## Branch model

| Branch | Purpose |
|---|---|
| `master` | Exact, fast-forward-only mirror of `upstream/master`; no CloudMold commits |
| `cloudmold/main` | CloudMold integration and release source; repository default branch |
| `feature/*` | Product development from `cloudmold/main` |
| `sync/upstream-*` | Reviewed upstream merge candidate into `cloudmold/main` |

Never develop directly on `master`. Do not rewrite published branches.

## Upstream synchronization

Run the read-only check at least weekly and within 24 hours of an upstream security release:

```bash
scripts/cloudmold/upstream-sync.sh check
```

Fast-forward the mirror branch only after reviewing the reported commits:

```bash
scripts/cloudmold/upstream-sync.sh mirror
```

Then merge the updated mirror into CloudMold through a dedicated branch and PR:

```bash
git switch cloudmold/main
git pull --ff-only origin cloudmold/main
git switch -c sync/upstream-YYYYMMDD
git merge --no-ff master
```

Resolve conflicts in favor of current upstream contracts unless a documented CloudMold decision
requires otherwise. Run affected Gradle tests, smoke the local distribution, and record both the
upstream base SHA and CloudMold head SHA in the PR and image labels.

## Customization policy

1. Prefer DataHub extension points, plugins, configuration, and public entity/aspect APIs.
2. Keep CloudMold changes small and separable so useful generic fixes can be contributed upstream.
3. Do not change upstream semantics only to hide a CloudMold projection bug; fix the authority or
   projection boundary first.
4. Separate catalog visibility from AI retrieval eligibility and business-write authority.
5. Preserve `LICENSE`, `NOTICE`, provenance, and upstream commit history.
6. Never commit credentials, R2 keys, tokens, private object paths, or production data.

## Release evidence

Every CloudMold build must record:

- upstream base SHA;
- CloudMold head SHA;
- image digest;
- schema or migration waterline;
- local/remote test results;
- rollback image and data recovery evidence;
- an explicit `productionCredit` boundary.

## Current local Apple Silicon baseline

The local P0 distribution is built from the exact upstream-compatible release source rather than
the moving `cloudmold/main` branch:

- branch: `cloudmold/release/1.7.0`;
- source commit: `7f81ccbfe27b9acc947f5f600fcf9ddb72138a80` (`v1.7.0`);
- build JDK: Java 21;
- runtime platform: `linux/arm64` on Apple Silicon Docker Desktop;
- images: `cloudmold/datahub-gms:v1.7.0`,
  `cloudmold/datahub-frontend-react:v1.7.0`, and
  `cloudmold/datahub-upgrade:v1.7.0`.

The `cloudmold-infra` DataHub wrapper fails closed unless all three images exist locally as
`linux/arm64`, removes the unused Actions service, and rejects upstream GMS, Frontend, or Upgrade
image references. Local runtime acceptance passed System Update, health, login, search, entity-count
reconciliation, and negative retrieval against the preserved P0 volumes.

This is a local distribution baseline only. The upstream Dockerfiles currently resolve a mutable
Wolfi `latest` base at build time; a production release must pin the reviewed base digest and add
SBOM, vulnerability, signature, provenance, immutable registry tag, remote exact-head CI, rollback,
and deployment evidence. `productionCredit=false`.
