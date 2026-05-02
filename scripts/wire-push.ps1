param(
  [switch]$SkipX,
  [int]$MaxNew = 300,
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

function Run-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Block
  )

  Write-Host "==> $Label"
  & $Block
}

$repo = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $repo

Run-Step "Sync main" {
  git fetch origin
  git pull --ff-only origin main
}

if (-not $SkipX) {
  Run-Step "Collect X likes" {
    $env:MAX_NEW = [string]$MaxNew
    npm run collect:x-likes
  }
} else {
  Write-Host "==> Skipping X collection"
}

Run-Step "Build Wire" {
  npm run build:wire
}

Run-Step "Build public site" {
  npm run build
}

Run-Step "Validate" {
  npm run validate
}

$status = git status --short
if (-not $status) {
  Write-Host "No public changes to push."
  exit 0
}

Run-Step "Commit public Wire changes" {
  git add scripts/build-wire.mjs scripts/build-site.mjs scripts/wire-push.ps1 public package.json package-lock.json .github/workflows/deploy.yml wrangler.jsonc
  $staged = git diff --cached --name-only
  if (-not $staged) {
    Write-Host "No tracked public changes staged."
  } else {
    $commitMessage = if ($Message) { $Message } else { "Update Knowledge Hub Wire" }
    git commit -m $commitMessage
    git push origin main
  }
}

Run-Step "Deploy GitHub Pages branch" {
  $src = (Resolve-Path -LiteralPath "public").Path
  $deployRoot = Join-Path $env:TEMP "knowledgehub-gh-pages-deploy"

  if (Test-Path -LiteralPath $deployRoot) {
    $resolved = (Resolve-Path -LiteralPath $deployRoot).Path
    if ($resolved -like (Join-Path $env:TEMP "knowledgehub-gh-pages-deploy*")) {
      Remove-Item -LiteralPath $resolved -Recurse -Force
    } else {
      throw "Refusing to remove unexpected path: $resolved"
    }
  }

  git worktree add $deployRoot gh-pages
  try {
    Push-Location $deployRoot
    Get-ChildItem -Force | Where-Object { $_.Name -ne ".git" } | ForEach-Object {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }
    Get-ChildItem -LiteralPath $src -Force | ForEach-Object {
      Copy-Item -LiteralPath $_.FullName -Destination $deployRoot -Recurse -Force
    }
    New-Item -ItemType File -Path (Join-Path $deployRoot ".nojekyll") -Force | Out-Null

    @'
{
  "name": "knowledgehub-static-pages",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "node build-static-copy.cjs"
  },
  "devDependencies": {
    "wrangler": "^4.87.0"
  }
}
'@ | Set-Content -LiteralPath (Join-Path $deployRoot "package.json") -Encoding UTF8

    @'
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const out = path.join(root, "public");
const exclude = new Set([
  ".git",
  ".cache",
  "public",
  "node_modules",
  "package.json",
  "package-lock.json",
  "wrangler.jsonc",
  "build-static-copy.cjs"
]);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (exclude.has(entry.name)) continue;
  const src = path.join(root, entry.name);
  const dest = path.join(out, entry.name);
  fs.cpSync(src, dest, { recursive: true });
}

console.log("Prepared static GitHub Pages output in public/.");
'@ | Set-Content -LiteralPath (Join-Path $deployRoot "build-static-copy.cjs") -Encoding UTF8

    @'
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "knowledgehub",
  "compatibility_date": "2026-05-02",
  "assets": {
    "directory": "./public"
  }
}
'@ | Set-Content -LiteralPath (Join-Path $deployRoot "wrangler.jsonc") -Encoding UTF8

    git add -A
    if (git diff --cached --quiet) {
      Write-Host "No GitHub Pages changes."
    } else {
      $deployMessage = if ($Message) { "Deploy: $Message" } else { "Deploy Knowledge Hub Wire" }
      git commit -m $deployMessage
      git push origin gh-pages
    }
  } finally {
    Pop-Location
    git worktree remove $deployRoot --force
  }
}

Write-Host "Wire push complete."
