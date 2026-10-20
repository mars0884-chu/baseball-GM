[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath,

    [string]$ProjectRoot,

    [switch]$SkipTests,

    [switch]$SkipLineage
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = Split-Path -Parent $PSScriptRoot
}

function Add-Result {
    param(
        [System.Collections.Generic.List[object]]$Results,
        [string]$Check,
        [bool]$Passed,
        [string]$Detail
    )
    $Results.Add([pscustomobject]@{
        check  = $Check
        passed = $Passed
        detail = $Detail
    })
    if (-not $Passed) {
        throw "$Check failed: $Detail"
    }
}

function Assert-SafeZipEntries {
    param(
        [System.IO.Compression.ZipArchive]$Archive,
        [string]$Label
    )
    $seen = @{}
    foreach ($entry in $Archive.Entries) {
        $name = $entry.FullName
        if ($name -match '[^\x00-\x7F]') {
            throw "$Label contains a non-ASCII entry: $name"
        }
        $normalized = $name.Replace('\', '/')
        if ($normalized -match '(^|/)\.\.(/|$)' -or $normalized.StartsWith('/')) {
            throw "$Label contains an unsafe entry: $name"
        }
        $key = $normalized.ToLowerInvariant()
        if ($seen.ContainsKey($key)) {
            throw "$Label contains a duplicate entry: $name"
        }
        $seen[$key] = $true
    }
}

function Get-FrontMatter {
    param([string]$Path)
    $text = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    if ($text -notmatch '(?s)\A---\r?\n(.*?)\r?\n---\r?\n') {
        throw "Missing YAML front matter: $([IO.Path]::GetFileName($Path))"
    }
    $data = @{}
    foreach ($line in ($matches[1] -split '\r?\n')) {
        if ($line -match '^([A-Za-z][A-Za-z0-9]*):\s*(.*)$') {
            $data[$matches[1]] = $matches[2].Trim()
        }
    }
    return $data
}

$resolvedZip = (Resolve-Path -LiteralPath $ZipPath).Path
$resolvedRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$zipHash = (Get-FileHash -LiteralPath $resolvedZip -Algorithm SHA256).Hash.ToUpperInvariant()
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("baseball-gm-delivery-audit-" + [Guid]::NewGuid().ToString('N'))
$results = [System.Collections.Generic.List[object]]::new()

Add-Type -AssemblyName System.IO.Compression.FileSystem

try {
    New-Item -ItemType Directory -Path $tempRoot | Out-Null

    $outerArchive = [IO.Compression.ZipFile]::OpenRead($resolvedZip)
    Assert-SafeZipEntries -Archive $outerArchive -Label 'outer ZIP'
    $outerFileEntries = @($outerArchive.Entries | Where-Object { $_.Name })
    Add-Result $results 'outer-entry-count' ($outerFileEntries.Count -eq 10) "expected 10 files, found $($outerFileEntries.Count)"
    $outerArchive.Dispose()

    Expand-Archive -LiteralPath $resolvedZip -DestinationPath $tempRoot
    $outerFiles = @(Get-ChildItem -LiteralPath $tempRoot -File)
    Add-Result $results 'clean-extraction' ($outerFiles.Count -eq 10) "extracted $($outerFiles.Count) outer files"

    $manifestFiles = @($outerFiles | Where-Object { $_.Name -match '^v[0-9]+_delivery_manifest\.json$' })
    Add-Result $results 'manifest-count' ($manifestFiles.Count -eq 1) "found $($manifestFiles.Count) delivery manifests"
    $manifestPath = $manifestFiles[0].FullName
    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json

    $gameVersion = [string]$manifest.gameVersion
    if ($gameVersion -notmatch '^v([0-9]+)$') {
        throw "Invalid gameVersion: $gameVersion"
    }
    $versionNumber = $matches[1]
    # v55-r010-codex 起，固定外層角色由兩份 Claude/Codex handoff 改為
    # Codex Development Log + Verification Report；舊 r009 與更早包仍走 handoff 契約。
    $codexOnlyRecords = @()
    $codexOnlyRecords = @($manifest.files | Where-Object { [string]$_.role -in @('codex-development-log', 'verification-report') })
    $usesCodexOnlyRoles = $codexOnlyRecords.Count -eq 2
    $roleFileNames = if ($usesCodexOnlyRoles) {
        @("v${versionNumber}_codex_development_log.md", "v${versionNumber}_verification_report.md")
    }
    else {
        @("v${versionNumber}_claude_to_codex_handoff.md", "v${versionNumber}_codex_to_claude_handoff.md")
    }
    $expectedNames = @(
        "${versionNumber}_baseball_gm.html",
        "${versionNumber}_baseball_gm_modular.zip",
        "v${versionNumber}_art_assets.zip",
        "v${versionNumber}_project_summary.md",
        "v${versionNumber}_full_pending_items.md",
        "v${versionNumber}_art_interface_spec.md"
    ) + $roleFileNames + @(
        "v${versionNumber}_delivery_manifest.json",
        'SHA256SUMS.txt'
    )
    $actualNames = @($outerFiles.Name | Sort-Object)
    $missing = @($expectedNames | Where-Object { $_ -notin $actualNames })
    $extra = @($actualNames | Where-Object { $_ -notin $expectedNames })
    Add-Result $results 'fixed-role-files' ($missing.Count -eq 0 -and $extra.Count -eq 0) "missing=[$($missing -join ', ')] extra=[$($extra -join ', ')]"

    Add-Result $results 'manifest-outer-count' ([int]$manifest.expectedOuterFileCount -eq 10) "manifest expectedOuterFileCount=$($manifest.expectedOuterFileCount)"
    $listedNames = @($manifest.outerFiles | ForEach-Object { [string]$_ } | Sort-Object)
    $manifestMissing = @($expectedNames | Where-Object { $_ -notin $listedNames })
    $manifestExtra = @($listedNames | Where-Object { $_ -notin $expectedNames })
    Add-Result $results 'manifest-outer-list' ($listedNames.Count -eq 10 -and $manifestMissing.Count -eq 0 -and $manifestExtra.Count -eq 0) "listed=$($listedNames.Count), missing=[$($manifestMissing -join ', ')], extra=[$($manifestExtra -join ', ')]"
    Add-Result $results 'authoritative-summary' ([string]$manifest.authoritativeSummary -eq "v${versionNumber}_project_summary.md") "authoritativeSummary=$($manifest.authoritativeSummary)"

    $shaPath = Join-Path $tempRoot 'SHA256SUMS.txt'
    $shaLines = @(Get-Content -LiteralPath $shaPath -Encoding ASCII | Where-Object { $_.Trim() })
    Add-Result $results 'sha-entry-count' ($shaLines.Count -eq 9) "expected 9 hashes, found $($shaLines.Count)"
    $shaFiles = @{}
    foreach ($line in $shaLines) {
        if ($line -notmatch '^([0-9A-Fa-f]{64})  ([\x20-\x7E]+)$') {
            throw "Invalid SHA256SUMS line: $line"
        }
        $expectedHash = $matches[1].ToUpperInvariant()
        $name = $matches[2]
        if ($name -eq 'SHA256SUMS.txt') {
            throw 'SHA256SUMS.txt must not hash itself'
        }
        $path = Join-Path $tempRoot $name
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "SHA entry is missing from ZIP: $name"
        }
        $actualHash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToUpperInvariant()
        if ($actualHash -ne $expectedHash) {
            throw "SHA mismatch: $name"
        }
        $shaFiles[$name] = $expectedHash
    }
    $expectedHashed = @($expectedNames | Where-Object { $_ -ne 'SHA256SUMS.txt' })
    $shaMissing = @($expectedHashed | Where-Object { -not $shaFiles.ContainsKey($_) })
    Add-Result $results 'sha-coverage' ($shaMissing.Count -eq 0) "missing hashes=[$($shaMissing -join ', ')]"

    $manifestRoles = @($manifest.files)
    Add-Result $results 'manifest-file-record-count' ($manifestRoles.Count -eq 10) "manifest files records=$($manifestRoles.Count)"
    $roleNames = @($manifestRoles | ForEach-Object { [string]$_.role })
    Add-Result $results 'manifest-unique-roles' (($roleNames | Sort-Object -Unique).Count -eq 10) "unique roles=$(($roleNames | Sort-Object -Unique).Count)"
    foreach ($record in $manifestRoles) {
        $pathName = [string]$record.path
        if ($pathName -notin $expectedNames) {
            throw "Manifest file record has an unexpected path: $pathName"
        }
        if ($pathName -eq 'SHA256SUMS.txt' -or $pathName -eq "v${versionNumber}_delivery_manifest.json") {
            if ($null -ne $record.contentSha256 -and [string]$record.contentSha256 -ne '') {
                throw "$pathName contentSha256 must be null to avoid self-reference"
            }
        }
        else {
            if ([string]$record.contentSha256 -ne $shaFiles[$pathName]) {
                throw "Manifest contentSha256 mismatch: $pathName"
            }
        }
    }
    Add-Result $results 'manifest-file-records' $true 'all 10 file records match paths and SHA data'

    $markdownChecks = @(
        @{ path = "v${versionNumber}_project_summary.md"; role = 'project-summary'; author = $null; authoritative = 'true' },
        @{ path = "v${versionNumber}_full_pending_items.md"; role = 'full-pending-items'; author = $null; authoritative = 'false' },
        @{ path = "v${versionNumber}_art_interface_spec.md"; role = 'art-interface-spec'; author = $null; authoritative = 'false' }
    )
    if ($usesCodexOnlyRoles) {
        $markdownChecks += @(
            @{ path = "v${versionNumber}_codex_development_log.md"; role = 'codex-development-log'; author = 'Codex'; authoritative = 'false' },
            @{ path = "v${versionNumber}_verification_report.md"; role = 'verification-report'; author = 'Codex'; authoritative = 'false' }
        )
    }
    else {
        $markdownChecks += @(
            @{ path = "v${versionNumber}_claude_to_codex_handoff.md"; role = 'claude-to-codex-handoff'; author = 'Claude'; authoritative = 'false' },
            @{ path = "v${versionNumber}_codex_to_claude_handoff.md"; role = 'codex-to-claude-handoff'; author = 'Codex'; authoritative = 'false' }
        )
    }
    foreach ($check in $markdownChecks) {
        $front = Get-FrontMatter -Path (Join-Path $tempRoot $check.path)
        $record = @($manifestRoles | Where-Object { [string]$_.path -eq $check.path })[0]
        $carriedPackageId = if ($record.PSObject.Properties.Name -contains 'carriedForwardFrom' -and $null -ne $record.carriedForwardFrom -and $record.carriedForwardFrom.PSObject.Properties.Name -contains 'packageId') {
            [string]$record.carriedForwardFrom.packageId
        }
        else {
            ''
        }
        $isImmutableCarryForward = (
            [string]$record.changeStatus -eq 'unchanged' -and
            -not [string]::IsNullOrWhiteSpace($carriedPackageId) -and
            (
                $check.path -in $roleFileNames -or
                $check.path -eq "v${versionNumber}_art_interface_spec.md"
            )
        )
        foreach ($required in @('documentRole', 'gameVersion', 'documentRevision', 'originalAuthor', 'lastModifiedBy', 'authoritative', 'packageId')) {
            if (-not $front.ContainsKey($required)) {
                throw "$($check.path) front matter is missing $required"
            }
        }
        if (
            $front.documentRole -ne $check.role -or
            ($front.gameVersion -ne $gameVersion -and -not $isImmutableCarryForward) -or
            $front.authoritative -ne $check.authoritative
        ) {
            throw "$($check.path) front matter does not match its manifest identity"
        }
        if ($front.packageId -ne [string]$manifest.packageId) {
            if (-not $isImmutableCarryForward) {
                throw "$($check.path) front matter packageId does not match the current package or its immutable carried-forward source"
            }
        }
        if ($null -ne $check.author -and ($front.originalAuthor -ne $check.author -or $front.lastModifiedBy -ne $check.author)) {
            throw "$($check.path) violates directional handoff ownership"
        }
    }
    Add-Result $results 'markdown-front-matter' $true 'all five Markdown role files have valid identity headers'

    $projectSummary = Get-Content -LiteralPath (Join-Path $tempRoot "v${versionNumber}_project_summary.md") -Raw -Encoding UTF8
    if ($projectSummary -notmatch '(?s)```(?:markdown|text)?\r?\n.+?\r?\n```') {
        throw 'Authoritative project summary does not contain a copy-ready fenced block'
    }
    foreach ($other in (@(
        "v${versionNumber}_full_pending_items.md",
        "v${versionNumber}_art_interface_spec.md"
    ) + $roleFileNames)) {
        $text = Get-Content -LiteralPath (Join-Path $tempRoot $other) -Raw -Encoding UTF8
        if ($text -match '(?s)```markdown\r?\n# .*脈絡還原') {
            throw "$other contains a competing full restoration summary"
        }
    }
    Add-Result $results 'single-restoration-summary' $true 'only the authoritative project summary contains the restoration block'

    $modularPath = Join-Path $tempRoot "${versionNumber}_baseball_gm_modular.zip"
    $modularArchive = [IO.Compression.ZipFile]::OpenRead($modularPath)
    try {
        Assert-SafeZipEntries -Archive $modularArchive -Label 'modular ZIP'
        $modularFiles = @($modularArchive.Entries | Where-Object { $_.Name })
        Add-Result $results 'modular-file-count' ($modularFiles.Count -eq 20) "found $($modularFiles.Count) modular files"
        $expectedModular = @(
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
        $modularNames = @($modularFiles.FullName | ForEach-Object { $_.Replace('\', '/') })
        $missingModular = @($expectedModular | Where-Object { $_ -notin $modularNames })
        $extraModular = @($modularNames | Where-Object { $_ -notin $expectedModular })
        Add-Result $results 'modular-fixed-roles' ($missingModular.Count -eq 0 -and $extraModular.Count -eq 0) "missing=[$($missingModular -join ', ')] extra=[$($extraModular -join ', ')]"
    }
    finally {
        $modularArchive.Dispose()
    }

    $artPath = Join-Path $tempRoot "v${versionNumber}_art_assets.zip"
    $artArchive = [IO.Compression.ZipFile]::OpenRead($artPath)
    try {
        Assert-SafeZipEntries -Archive $artArchive -Label 'art ZIP'
        $artFileCount = @($artArchive.Entries | Where-Object { $_.Name }).Count
        $artEntryCount = $artArchive.Entries.Count
        Add-Result $results 'art-archive-safety' $true "files=$artFileCount entries=$artEntryCount"
    }
    finally {
        $artArchive.Dispose()
    }

    if (-not $SkipLineage) {
        $statePath = Join-Path $resolvedRoot 'CURRENT_PACKAGE.json'
        if (Test-Path -LiteralPath $statePath) {
            $state = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ([string]$state.status -eq 'active') {
                if ([string]$manifest.packageId -eq [string]$state.packageId) {
                    Add-Result $results 'lineage-current-package' ($zipHash -eq [string]$state.zipSha256) 'candidate is the registered current package'
                }
                else {
                    Add-Result $results 'lineage-parent' ([string]$manifest.basedOnPackageId -eq [string]$state.packageId) "basedOnPackageId=$($manifest.basedOnPackageId), current=$($state.packageId)"
                    if ([string]$manifest.gameVersion -eq [string]$state.gameVersion) {
                        Add-Result $results 'lineage-revision' ([int]$manifest.packageRevision -eq ([int]$state.packageRevision + 1)) "candidate revision=$($manifest.packageRevision), current revision=$($state.packageRevision)"
                    }
                    else {
                        Add-Result $results 'lineage-formal-upgrade' ([bool]$manifest.formalVersionUpgrade -and [int]$manifest.packageRevision -eq 1) "formalVersionUpgrade=$($manifest.formalVersionUpgrade), revision=$($manifest.packageRevision)"
                    }
                }
            }
            else {
                Add-Result $results 'lineage-state' $true 'CURRENT_PACKAGE.json is uninitialized; bootstrap validation allowed'
            }
        }
    }

    if (-not $SkipTests) {
        $moduleDir = Join-Path $tempRoot 'modular'
        New-Item -ItemType Directory -Path $moduleDir | Out-Null
        Expand-Archive -LiteralPath $modularPath -DestinationPath $moduleDir
        Push-Location $moduleDir
        try {
            foreach ($test in @('test_regression.js', 'smoke_multiyear.js', 'smoke_puregm.js')) {
                $savedErrorActionPreference = $ErrorActionPreference
                $ErrorActionPreference = 'Continue'
                try {
                    $testOutput = @(& node $test 2>&1)
                    $testExitCode = $LASTEXITCODE
                }
                finally {
                    $ErrorActionPreference = $savedErrorActionPreference
                }
                if ($testExitCode -ne 0) {
                    throw "$test failed with exit code $testExitCode`n$($testOutput -join "`n")"
                }
            }
        }
        finally {
            Pop-Location
        }
        Add-Result $results 'node-tests' $true 'regression and both 15-year smoke suites passed'
    }

    [pscustomobject]@{
        valid           = $true
        zipPath         = $resolvedZip
        zipSha256       = $zipHash
        gameVersion     = $gameVersion
        packageRevision = [int]$manifest.packageRevision
        packageId       = [string]$manifest.packageId
        checks          = $results
    } | ConvertTo-Json -Depth 6
}
catch {
    [pscustomobject]@{
        valid     = $false
        zipPath   = $resolvedZip
        zipSha256 = $zipHash
        error     = $_.Exception.Message
        checks    = $results
    } | ConvertTo-Json -Depth 6
    exit 1
}
finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
