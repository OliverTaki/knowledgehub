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

function Invoke-Native {
  $FilePath = $args[0]
  $Arguments = @($args | Select-Object -Skip 1)

  if (-not $FilePath) {
    throw "Invoke-Native requires a command."
  }

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
  }
}

$repo = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $repo

Run-Step "Sync main" {
  Invoke-Native git fetch origin
  Invoke-Native git pull --ff-only origin main
}

if (-not $SkipX) {
  Run-Step "Collect X likes" {
    $env:MAX_NEW = [string]$MaxNew
    Invoke-Native npm run collect:x-likes
  }
} else {
  Write-Host "==> Skipping X collection"
}

if (Test-Path -LiteralPath "C:\Users\punch\Desktop\AI_Blog_Editorial_Shared\05_drafts\blogger") {
  Run-Step "Import legacy Blogger notes" {
    Invoke-Native npm run import:legacy-blogger
  }
} else {
  Write-Host "==> Skipping legacy Blogger import"
}

Run-Step "Build Wire" {
  Invoke-Native npm run build:wire
}

Run-Step "Build public site" {
  Invoke-Native npm run build
}

Run-Step "Validate" {
  Invoke-Native npm run validate
}

$status = git status --short
if (-not $status) {
  Write-Host "No public changes to push."
  exit 0
}

Run-Step "Commit public Wire changes" {
    Invoke-Native git add .gitignore scripts/build-wire.mjs scripts/build-site.mjs scripts/import-legacy-blogger.mjs scripts/wire-push.ps1 data/tag-taxonomy.json data/editorial-label-model.json data/processed/library_seed.json data/legacy-blogger-articles.json data/legacy-blogger-source-notes.json data/legacy-blogger-wire.json public package.json package-lock.json .github/workflows/deploy.yml wrangler.jsonc
  $staged = git diff --cached --name-only
  if (-not $staged) {
    Write-Host "No tracked public changes staged."
  } else {
    $commitMessage = if ($Message) { $Message } else { "Update Knowledge Hub Wire" }
    Invoke-Native git commit -m $commitMessage
    Invoke-Native git push origin main
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

  Invoke-Native git worktree add $deployRoot gh-pages
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

    Invoke-Native git add -A
    git diff --cached --quiet
    $hasNoPagesChanges = $LASTEXITCODE -eq 0
    if ($hasNoPagesChanges) {
      Write-Host "No GitHub Pages changes."
    } else {
      $deployMessage = if ($Message) { "Deploy: $Message" } else { "Deploy Knowledge Hub Wire" }
      Invoke-Native git commit -m $deployMessage
      Invoke-Native git push origin gh-pages
    }
  } finally {
    Pop-Location
    Invoke-Native git worktree remove $deployRoot --force
  }
}

Write-Host "Wire push complete."
