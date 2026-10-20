[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$toolRoot = Split-Path -Parent $PSScriptRoot
$validator = Join-Path $toolRoot 'validate_delivery.ps1'
$promoter = Join-Path $toolRoot 'promote_delivery.ps1'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("baseball-gm-tool-test-" + [Guid]::NewGuid().ToString('N'))
$packageDir = Join-Path $tempRoot 'package'
$moduleDir = Join-Path $tempRoot 'module'
$artDir = Join-Path $tempRoot 'art'
$zipPath = Join-Path $tempRoot 'v99_delivery.zip'
$packageId = 'v99-r001-test'

function Write-Utf8NoBom {
    param([string]$Path, [string]$Text)
    [IO.File]::WriteAllText($Path, $Text, [Text.UTF8Encoding]::new($false))
}

try {
    New-Item -ItemType Directory -Path $packageDir, $moduleDir, $artDir | Out-Null

    $moduleNames = @(
        '00-theme.js',
        '01-data-engine.js',
        '02-finance.js',
        '03-simulation.js',
        '04-state-core.js',
        '05-ui-dashboard.js',
        '06-ui-roster.js',
        'baseball_gm_century_empire_design_v1_2.md',
        'design_doc.md',
        'icon-180.png',
        'icon-192.png',
        'icon-512.png',
        'index.html',
        'manifest.webmanifest',
        'smoke_multiyear.js',
        'smoke_puregm.js',
        'style.css',
        'sw.js',
        'test_regression.js',
        'theme_pack_example.json'
    )
    foreach ($name in $moduleNames) {
        Write-Utf8NoBom -Path (Join-Path $moduleDir $name) -Text "fixture $name"
    }
    Compress-Archive -Path (Join-Path $moduleDir '*') -DestinationPath (Join-Path $packageDir '99_baseball_gm_modular.zip')

    Write-Utf8NoBom -Path (Join-Path $artDir 'asset.txt') -Text 'fixture art'
    Compress-Archive -Path (Join-Path $artDir '*') -DestinationPath (Join-Path $packageDir 'v99_art_assets.zip')
    Write-Utf8NoBom -Path (Join-Path $packageDir '99_baseball_gm.html') -Text '<!doctype html><title>fixture</title>'

    $docs = @(
        @{ name = 'v99_project_summary.md'; role = 'project-summary'; original = 'Claude'; last = 'Test'; authoritative = 'true'; body = "# Fixture`r`n`r`n``````markdown`r`n# Restore fixture`r`n``````" },
        @{ name = 'v99_full_pending_items.md'; role = 'full-pending-items'; original = 'Claude'; last = 'Test'; authoritative = 'false'; body = '# Pending' },
        @{ name = 'v99_art_interface_spec.md'; role = 'art-interface-spec'; original = 'Claude'; last = 'Test'; authoritative = 'false'; body = '# Art interface' },
        @{ name = 'v99_claude_to_codex_handoff.md'; role = 'claude-to-codex-handoff'; original = 'Claude'; last = 'Claude'; authoritative = 'false'; body = '# Claude to Codex' },
        @{ name = 'v99_codex_to_claude_handoff.md'; role = 'codex-to-claude-handoff'; original = 'Codex'; last = 'Codex'; authoritative = 'false'; body = '# Codex to Claude' }
    )
    foreach ($doc in $docs) {
        $front = @"
---
documentRole: $($doc.role)
gameVersion: v99
documentRevision: 1
originalAuthor: $($doc.original)
lastModifiedBy: $($doc.last)
authoritative: $($doc.authoritative)
packageId: $packageId
---

$($doc.body)
"@
        Write-Utf8NoBom -Path (Join-Path $packageDir $doc.name) -Text $front
    }

    $outerNames = @(
        '99_baseball_gm.html',
        '99_baseball_gm_modular.zip',
        'v99_art_assets.zip',
        'v99_project_summary.md',
        'v99_full_pending_items.md',
        'v99_art_interface_spec.md',
        'v99_claude_to_codex_handoff.md',
        'v99_codex_to_claude_handoff.md',
        'v99_delivery_manifest.json',
        'SHA256SUMS.txt'
    )
    $roleMap = [ordered]@{
        '99_baseball_gm.html' = 'integrated-html'
        '99_baseball_gm_modular.zip' = 'modular-zip'
        'v99_art_assets.zip' = 'art-assets-zip'
        'v99_project_summary.md' = 'project-summary'
        'v99_full_pending_items.md' = 'full-pending-items'
        'v99_art_interface_spec.md' = 'art-interface-spec'
        'v99_claude_to_codex_handoff.md' = 'claude-to-codex-handoff'
        'v99_codex_to_claude_handoff.md' = 'codex-to-claude-handoff'
        'v99_delivery_manifest.json' = 'delivery-manifest'
        'SHA256SUMS.txt' = 'sha256-list'
    }
    $fileRecords = @()
    foreach ($name in $outerNames) {
        $hash = $null
        if ($name -ne 'v99_delivery_manifest.json' -and $name -ne 'SHA256SUMS.txt') {
            $hash = (Get-FileHash -LiteralPath (Join-Path $packageDir $name) -Algorithm SHA256).Hash
        }
        $original = if ($name -eq 'v99_codex_to_claude_handoff.md') { 'Codex' } else { 'Claude' }
        $last = if ($name -eq 'v99_codex_to_claude_handoff.md') { 'Codex' } else { 'Test' }
        if ($name -eq 'v99_claude_to_codex_handoff.md') {
            $last = 'Claude'
        }
        $fileRecords += [ordered]@{
            role = $roleMap[$name]
            path = $name
            contentSha256 = $hash
            originVersion = 'v99'
            originalAuthor = $original
            lastModifiedBy = $last
            changeStatus = 'new'
            carriedForwardFrom = $null
        }
    }
    $manifest = [ordered]@{
        manifestVersion = 1
        gameVersion = 'v99'
        packageRevision = 1
        packageId = $packageId
        createdBy = 'Test'
        basedOnPackageId = 'fixture-bootstrap'
        supersedesPackageId = 'fixture-bootstrap'
        formalVersionUpgrade = $false
        authoritativeSummary = 'v99_project_summary.md'
        expectedOuterFileCount = 10
        outerFiles = $outerNames
        files = $fileRecords
        verification = [ordered]@{}
        remainingWork = @()
    }
    Write-Utf8NoBom -Path (Join-Path $packageDir 'v99_delivery_manifest.json') -Text ($manifest | ConvertTo-Json -Depth 8)

    $shaLines = @()
    foreach ($name in ($outerNames | Where-Object { $_ -ne 'SHA256SUMS.txt' })) {
        $shaLines += "$((Get-FileHash -LiteralPath (Join-Path $packageDir $name) -Algorithm SHA256).Hash)  $name"
    }
    [IO.File]::WriteAllLines((Join-Path $packageDir 'SHA256SUMS.txt'), $shaLines, [Text.Encoding]::ASCII)
    Compress-Archive -Path (Join-Path $packageDir '*') -DestinationPath $zipPath

    $output = & $validator -ZipPath $zipPath -ProjectRoot (Split-Path -Parent $toolRoot) -SkipTests -SkipLineage
    $validatorSucceeded = $?
    if (-not $validatorSucceeded) {
        throw "Validator rejected the valid fixture:`n$output"
    }
    $result = $output | ConvertFrom-Json
    if (-not $result.valid -or $result.packageId -ne $packageId) {
        throw "Unexpected validator result:`n$output"
    }

    $promoteOutput = & $promoter -ZipPath $zipPath -ProjectRoot (Split-Path -Parent $toolRoot) -SkipTests -WhatIf
    $promoteSucceeded = $?
    if (-not $promoteSucceeded) {
        throw "Promote -WhatIf failed:`n$promoteOutput"
    }

    "PASS packageId=$($result.packageId) checks=$($result.checks.Count) promoteWhatIf=true"
}
finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
