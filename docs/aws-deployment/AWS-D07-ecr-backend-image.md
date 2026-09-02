# AWS-D07 — ECR + Production Backend Docker Image

Phase **AWS-D07** creates a private ECR repository and pushes an immutable production NestJS backend Docker image.

**Status:** **PASS** (remediated 2026-09-01)

## Prerequisites

- AWS-D03/D04/D06 complete
- Docker Desktop/daemon running locally
- AWS CLI v2, account `812047028300`, region `us-east-1`
- Git available for release tag metadata

## Windows execution (canonical)

```powershell
aws sts get-caller-identity
docker version

powershell -ExecutionPolicy Bypass -File scripts/aws/d07-ecr-image.ps1
```

## ECR repository

| Setting | Value |
|---|---|
| **Name** | `eaziacall-prod-backend` |
| **URI** | `812047028300.dkr.ecr.us-east-1.amazonaws.com/eaziacall-prod-backend` |
| **Visibility** | Private (default) |
| **Tag mutability** | `IMMUTABLE` |
| **Scan on push** | `true` |
| **Encryption** | `AES256` |

## Canonical backend image (PASS)

| Field | Value |
|---|---|
| **Tag** | `aa49b93-20260901t125102z` |
| **Digest** | `sha256:98beea787f8c3eb93aacab3f6abc27ae3efbe92e6b7657681d0afc74a5dfa1b9` |
| **Platform** | `linux/amd64` |
| **Alpine** | `3.24.1` |
| **OpenSSL packages** | `libssl3-3.5.8-r0`, `libcrypto3-3.5.8-r0` |
| **ECR scan** | `COMPLETE`, CRITICAL=0, HIGH=0 |
| **CVE-2026-63073** | Absent |

## D07 remediation (CVE-2026-63073)

Initial D07 push was **BLOCKED** by ECR basic scanning:

- **CVE:** CVE-2026-63073 (OpenSSL CMP format-string; Alpine `libssl3`/`libcrypto3` **3.5.7-r0**)
- **Blocked tag:** `aa49b93-20260901t123434z` — **DO NOT DEPLOY**

**Remediation applied:**

- Added `RUN apk upgrade --no-cache` to both Dockerfile stages (official Alpine stable repos)
- Production builds use `docker build --pull --no-cache --platform linux/amd64 --provenance=false --sbom=false`
- Verified runtime packages upgrade to **3.5.8-r0** before push
- New immutable release pushed and scanned clean

## Deprecated / non-canonical images (DO NOT DEPLOY)

| Tag | Reason |
|---|---|
| `aa49b93-20260901t122259z` | OCI index manifest (not ECR-scannable) |
| `aa49b93-20260901t123434z` | ECR CRITICAL CVE-2026-63073 (OpenSSL 3.5.7-r0) |

These remain in ECR due to immutable tags and lifecycle policy; inventory marks them deprecated.

## Lifecycle policy

- Expire **untagged** images after **7 days**
- Retain latest **20** repository images (lowest-priority catch-all rule)

## Release tag strategy

Format: `<git-sha>-<UTC-timestamp>` (lowercase)

- Unique per build execution
- Never overwrites immutable tags
- Idempotent rerun reuses inventory tag/digest only when ECR scan has **CRITICAL=0**

## Docker build

| Setting | Value |
|---|---|
| **Context** | `ai-call-agent-backend/` |
| **Dockerfile** | `ai-call-agent-backend/Dockerfile` |
| **Platform** | `linux/amd64` |
| **Production CMD** | `node dist/main.js` |
| **Port** | 3000 |
| **Build flags** | `--pull --no-cache --provenance=false --sbom=false` |

No production secrets injected at build. `.dockerignore` excludes `.env` files.

## Migration tooling (present, not executed)

```bash
node dist/database/bootstrap-eazi-migrations.js &&
node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run
```

**Not executed in D07.**

## IAM notes

- **Deployer user** pushes to ECR during D07
- **ECS application task role** (`eaziacall-prod-ecs-task-role` from D06) — S3 only, no ECR permissions
- **ECS task execution role** (ECR pull, logs, secrets) — deferred to AWS-D08

## Vulnerability scanning

`scanOnPush=true`. **CRITICAL > 0 blocks D07 PASS.** Script verifies CVE-2026-63073 absence after scan completes.

## Explicitly not done in D07

- No ECS cluster/task/service
- No ECS task execution role
- No backend deployment
- No DB migrations
- No mutable `latest` as canonical artifact

## Full application runtime test

**DEFERRED TO AWS-D08/D11**

## M12 / Redis

- **P05-M12-GATE = OPEN**
- **Redis:** DEFERRED (`REDIS_ENABLED=false`)

## Next phase

**AWS-D08 — ECS Runtime Foundation** (do not start until instructed)
