#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
mode="${1:-check}"

expected_origin="https://github.com/CloudMold/cloudmold-datahub.git"
expected_upstream="https://github.com/datahub-project/datahub.git"

cd "$repo_root"

if [[ "$mode" != "check" && "$mode" != "mirror" ]]; then
  printf 'usage: %s [check|mirror]\n' "$0" >&2
  exit 2
fi

if [[ "$(git remote get-url origin)" != "$expected_origin" ]]; then
  printf 'origin must be %s\n' "$expected_origin" >&2
  exit 2
fi
if [[ "$(git remote get-url upstream)" != "$expected_upstream" ]]; then
  printf 'upstream must be %s\n' "$expected_upstream" >&2
  exit 2
fi

git fetch --prune origin master
git fetch --prune upstream master

origin_unique="$(git rev-list --count upstream/master..origin/master)"
upstream_new="$(git rev-list --count origin/master..upstream/master)"

if [[ "$origin_unique" != "0" ]]; then
  printf 'BLOCKED: origin/master contains %s commit(s) not present upstream; mirror policy violated\n' \
    "$origin_unique" >&2
  exit 2
fi

printf 'origin_master=%s\n' "$(git rev-parse origin/master)"
printf 'upstream_master=%s\n' "$(git rev-parse upstream/master)"
printf 'upstream_new_commits=%s\n' "$upstream_new"

if [[ "$mode" == "check" ]]; then
  exit 0
fi

if [[ -n "$(git status --porcelain)" ]]; then
  printf 'BLOCKED: worktree must be clean before mirror update\n' >&2
  exit 2
fi

starting_branch="$(git branch --show-current)"
git switch master
git merge --ff-only upstream/master
git push origin master
git switch "$starting_branch"

printf 'mirror_status=PASS\n'

