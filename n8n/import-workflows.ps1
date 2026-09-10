# Import workflow JSON from n8n/workflows into the local nutrition-app-n8n stack.
# Run from repository root or this folder:
#   .\n8n\import-workflows.ps1
#
# Requires the local n8n compose project to be running (docs/N8N.md).
# Re-runs replace the committed workflow ids instead of creating duplicates.

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$RepoRoot = Split-Path -Parent $Root
$ComposeProject = "nutrition-app-n8n"
$ComposeFile = Join-Path $RepoRoot "docker-compose.n8n.yml"
$EnvFile = Join-Path $Root ".env"
$WorkflowsDir = Join-Path $Root "workflows"

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing n8n/.env. Copy n8n/.env.example and start n8n first (see docs/N8N.md)."
}

$files = @(
  "lab-pdf-webhook.json",
  "lab-interpret-webhook.json",
  "meal-diary-webhook.json",
  "meal-app-analyze.json",
  "meal-voice-transcribe.json",
  "mentor-meal-notify.json",
  "telegram-polling-pcc-inbox.json"
)

$service = "n8n"
$running = docker compose -p $ComposeProject --env-file $EnvFile -f $ComposeFile ps --status running --services
if ($running -notcontains $service) {
  Write-Error "Local n8n is not running. Start it with docs/N8N.md commands first."
}

function Invoke-N8n([string[]]$N8nArgs) {
  docker compose -p $ComposeProject --env-file $EnvFile -f $ComposeFile exec -T $service n8n @N8nArgs
}

foreach ($file in $files) {
  $local = Join-Path $WorkflowsDir $file
  if (-not (Test-Path $local)) {
    Write-Error "Missing workflow file: $local"
  }
  $workflow = Get-Content -Raw -Path $local | ConvertFrom-Json
  $workflowId = [string]$workflow.id
  if (-not $workflowId) {
    Write-Error "Workflow JSON has no id: $local"
  }
  $remote = "/tmp/$file"
  Write-Host "→ copy $file"
  docker compose -p $ComposeProject --env-file $EnvFile -f $ComposeFile cp $local "${service}:${remote}"

  Write-Host "→ upsert $file ($workflowId)"
  $overwriteFailed = $false
  try {
    Invoke-N8n @("import:workflow", "--input=$remote", "--overwrite")
    if ($LASTEXITCODE -ne 0) { $overwriteFailed = $true }
  } catch {
    $overwriteFailed = $true
  }

  if ($overwriteFailed) {
    Write-Host "  overwrite unavailable; delete $workflowId if present, then import"
    $previousError = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      Invoke-N8n @("delete:workflow", "--id=$workflowId") | Out-Null
    } catch {
      # Missing workflow or older n8n without delete:workflow — import anyway.
    }
    $ErrorActionPreference = $previousError
    Invoke-N8n @("import:workflow", "--input=$remote")
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Failed to import $file"
    }
  }
}

Write-Host ""
Write-Host "Imported. Open http://localhost:5679 and reconnect credentials / activate as needed."
Write-Host "Webhook base: http://localhost:5679/webhook/"
