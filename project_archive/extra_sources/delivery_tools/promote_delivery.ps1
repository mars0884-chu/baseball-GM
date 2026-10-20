[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath,

    [string]$ProjectRoot,

    [switch]$UserConfirmedArchived,

    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = Split-Path -Parent $PSScriptRoot
}

$resolvedRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$resolvedZip = (Resolve-Path -LiteralPath $ZipPath).Path
$validator = Join-Path $PSScriptRoot 'validate_delivery.ps1'
$statePath = Join-Path $resolvedRoot 'CURRENT_PACKAGE.json'
$currentDir = Join-Path $resolvedRoot 'current'
$incomingDir = Join-Path $resolvedRoot '_incoming'
$stagingDir = Join-Path $resolvedRoot '_staging'
$auditDir = Join-Path $resolvedRoot '_audit'

foreach ($path in @($incomingDir, $stagingDir, $auditDir, $currentDir)) {
    $parent = [IO.Path]::GetFullPath((Split-Path -Parent $path)).TrimEnd('\')
    if ($parent -ne $resolvedRoot.TrimEnd('\')) {
        throw "Unsafe managed path outside project root: $path"
    }
}

$validationText = if ($SkipTests) {
    & $validator -ZipPath $resolvedZip -ProjectRoot $resolvedRoot -SkipTests
}
else {
    & $validator -ZipPath $resolvedZip -ProjectRoot $resolvedRoot
}
$validationSucceeded = $?
if (-not $validationSucceeded) {
    throw "Delivery validation failed:`n$validationText"
}
$validation = $validationText | ConvertFrom-Json

$state = $null
if (Test-Path -LiteralPath $statePath) {
    $state = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
}
$hasActive = $null -ne $state -and [string]$state.status -eq 'active'
$isFormalUpgrade = $hasActive -and [string]$validation.gameVersion -ne [string]$state.gameVersion
if ($isFormalUpgrade -and -not $UserConfirmedArchived) {
    throw 'A different formal version is active. Mars must confirm the previous version is archived, then rerun with -UserConfirmedArchived.'
}

if (-not $PSCmdlet.ShouldProcess($resolvedRoot, "Promote $($validation.packageId) as the only current package")) {
    return
}

$promotionSourceZip = $resolvedZip
$preservedSourceZip = $null
foreach ($managedDir in @($incomingDir, $stagingDir, $auditDir)) {
    $managedPrefix = [IO.Path]::GetFullPath($managedDir).TrimEnd('\') + '\'
    if ($resolvedZip.StartsWith($managedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        $preservedSourceZip = Join-Path ([IO.Path]::GetTempPath()) (
            "baseball-gm-promotion-source-" + [Guid]::NewGuid().ToString('N') + '.zip'
        )
        Copy-Item -LiteralPath $resolvedZip -Destination $preservedSourceZip
        $promotionSourceZip = $preservedSourceZip
        break
    }
}

try {
    foreach ($temp in @($incomingDir, $stagingDir, $auditDir)) {
        if (Test-Path -LiteralPath $temp) {
            Remove-Item -LiteralPath $temp -Recurse -Force
        }
        New-Item -ItemType Directory -Path $temp | Out-Null
    }

    $candidateZip = Join-Path $incomingDir ([IO.Path]::GetFileName($resolvedZip))
    Copy-Item -LiteralPath $promotionSourceZip -Destination $candidateZip
}
finally {
    if ($null -ne $preservedSourceZip -and (Test-Path -LiteralPath $preservedSourceZip)) {
        Remove-Item -LiteralPath $preservedSourceZip -Force
    }
}

$candidateDir = Join-Path $stagingDir 'candidate'
New-Item -ItemType Directory -Path $candidateDir | Out-Null
Expand-Archive -LiteralPath $candidateZip -DestinationPath $candidateDir

if (Test-Path -LiteralPath $currentDir) {
    Remove-Item -LiteralPath $currentDir -Recurse -Force
}
Move-Item -LiteralPath $candidateDir -Destination $currentDir

$targetZipName = "$($validation.gameVersion)_delivery.zip"
$targetZip = Join-Path $resolvedRoot $targetZipName
if (Test-Path -LiteralPath $targetZip) {
    Remove-Item -LiteralPath $targetZip -Force
}
Copy-Item -LiteralPath $candidateZip -Destination $targetZip

if ($isFormalUpgrade -and $UserConfirmedArchived -and -not [string]::IsNullOrWhiteSpace([string]$state.zipFile)) {
    $previousZip = Join-Path $resolvedRoot ([string]$state.zipFile)
    $previousParent = [IO.Path]::GetFullPath((Split-Path -Parent $previousZip)).TrimEnd('\')
    if ($previousParent -ne $resolvedRoot.TrimEnd('\')) {
        throw "Unsafe previous ZIP path in CURRENT_PACKAGE.json: $previousZip"
    }
    if ($previousZip -ne $targetZip -and (Test-Path -LiteralPath $previousZip -PathType Leaf)) {
        Remove-Item -LiteralPath $previousZip -Force
    }
}

$newState = [ordered]@{
    schemaVersion   = 1
    status          = 'active'
    gameVersion     = [string]$validation.gameVersion
    packageRevision = [int]$validation.packageRevision
    packageId       = [string]$validation.packageId
    zipFile         = $targetZipName
    zipSha256       = [string]$validation.zipSha256
    promotedAt      = (Get-Date).ToUniversalTime().ToString('o')
    note            = 'Promoted only after fixed-role validation.'
}
$newState | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding UTF8

foreach ($temp in @($incomingDir, $stagingDir, $auditDir)) {
    if (Test-Path -LiteralPath $temp) {
        Remove-Item -LiteralPath $temp -Recurse -Force
    }
}

[pscustomobject]@{
    promoted  = $true
    packageId = [string]$validation.packageId
    current   = $currentDir
    zip       = $targetZip
    state     = $statePath
} | ConvertTo-Json -Depth 4
