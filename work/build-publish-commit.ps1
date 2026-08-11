$ErrorActionPreference = "Stop"

function Get-GitText([string] $Arguments) {
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = (Get-Command git).Source
  $startInfo.Arguments = $Arguments
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $process = [System.Diagnostics.Process]::Start($startInfo)
  $memory = [System.IO.MemoryStream]::new()
  $process.StandardOutput.BaseStream.CopyTo($memory)
  $errorText = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) { throw $errorText }
  return [System.Text.UTF8Encoding]::new($false, $true).GetString($memory.ToArray())
}

function Write-GitBlob([byte[]] $Bytes) {
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = (Get-Command git).Source
  $startInfo.Arguments = "hash-object -w --stdin"
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $process = [System.Diagnostics.Process]::Start($startInfo)
  $process.StandardInput.BaseStream.Write($Bytes, 0, $Bytes.Length)
  $process.StandardInput.BaseStream.Close()
  $output = $process.StandardOutput.ReadToEnd().Trim()
  $errorText = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) { throw $errorText }
  return $output
}

function New-GitTree([string[]] $Entries) {
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $inputText = (($Entries | Sort-Object { ($_ -split "`t", 2)[1] }) -join "`n") + "`n"
  $bytes = $utf8.GetBytes($inputText)
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = (Get-Command git).Source
  $startInfo.Arguments = "mktree"
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $process = [System.Diagnostics.Process]::Start($startInfo)
  $process.StandardInput.BaseStream.Write($bytes, 0, $bytes.Length)
  $process.StandardInput.BaseStream.Close()
  $output = $process.StandardOutput.ReadToEnd().Trim()
  $errorText = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) { throw $errorText }
  return $output
}

$remoteText = Get-GitText "cat-file blob origin/main:src/App.jsx"
$approvedText = Get-GitText "cat-file blob 80efdd0:src/App.jsx"
$patchText = Get-GitText "diff --unified=0 --no-color 726a496 80efdd0 -- src/App.jsx"

$remoteRecords = [System.Collections.Generic.List[string]]::new()
$position = 0
while ($position -lt $remoteText.Length) {
  $nextLineFeed = $remoteText.IndexOf("`n", $position)
  if ($nextLineFeed -lt 0) {
    $remoteRecords.Add($remoteText.Substring($position))
    $position = $remoteText.Length
  } else {
    $remoteRecords.Add($remoteText.Substring($position, $nextLineFeed - $position + 1))
    $position = $nextLineFeed + 1
  }
}

$result = [System.Text.StringBuilder]::new()
$remoteCursor = 0
$patchLines = $patchText.Split("`n")
$patchCursor = 0

while ($patchCursor -lt $patchLines.Length) {
  $patchLine = $patchLines[$patchCursor].TrimEnd("`r")
  if ($patchLine -match "^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@") {
    $oldStart = [int] $matches[1]
    $oldCount = if ([string]::IsNullOrEmpty($matches[2])) { 1 } else { [int] $matches[2] }
    $startIndex = if ($oldStart -eq 0) { 0 } elseif ($oldCount -eq 0) { $oldStart } else { $oldStart - 1 }

    while ($remoteCursor -lt $startIndex) {
      [void] $result.Append($remoteRecords[$remoteCursor])
      $remoteCursor++
    }

    $patchCursor++
    while ($patchCursor -lt $patchLines.Length) {
      $bodyLine = $patchLines[$patchCursor].TrimEnd("`r")
      if ($bodyLine.StartsWith("@@ ") -or $bodyLine.StartsWith("diff --git ")) { break }
      if ($bodyLine.StartsWith("-")) {
        $remoteCursor++
      } elseif ($bodyLine.StartsWith("+")) {
        [void] $result.Append($bodyLine.Substring(1))
        [void] $result.Append("`n")
      } elseif ($bodyLine.StartsWith(" ")) {
        [void] $result.Append($remoteRecords[$remoteCursor])
        $remoteCursor++
      }
      $patchCursor++
    }
    continue
  }
  $patchCursor++
}

while ($remoteCursor -lt $remoteRecords.Count) {
  [void] $result.Append($remoteRecords[$remoteCursor])
  $remoteCursor++
}

$mergedText = $result.ToString()
$mergedNormalized = $mergedText -replace "`r`n", "`n"
$approvedNormalized = $approvedText -replace "`r`n", "`n"
if ($mergedNormalized -cne $approvedNormalized) {
  $mergedLines = $mergedNormalized.Split("`n")
  $approvedLines = $approvedNormalized.Split("`n")
  $limit = [Math]::Min($mergedLines.Length, $approvedLines.Length)
  $firstDifference = -1
  for ($lineIndex = 0; $lineIndex -lt $limit; $lineIndex++) {
    if ($mergedLines[$lineIndex] -cne $approvedLines[$lineIndex]) {
      $firstDifference = $lineIndex
      break
    }
  }
  throw "Merge verification failed at line $($firstDifference + 1). Merged: $($mergedLines[$firstDifference]) Approved: $($approvedLines[$firstDifference])"
}

$utf8 = [System.Text.UTF8Encoding]::new($false)
$appBlob = Write-GitBlob $utf8.GetBytes($mergedText)

$srcEntries = @(git ls-tree origin/main:src) | Where-Object { -not $_.EndsWith("`tApp.jsx") }
$srcEntries += "100644 blob $appBlob`tApp.jsx"
$srcTree = New-GitTree $srcEntries

$publicEntries = @(git ls-tree origin/main:public)
$publicEntries += "100644 blob ef19d95b678d4d5ec3af0f63165ae7fd142ea0e9`thero-summer.webp"
$publicEntries += "100644 blob 3fadc441fa969af5ac2a257e5d95ca7eeb64f64d`tlogo-3d.webp"
$publicEntries += "100644 blob fbece41ba0a02043712c4c52cc2c0c02a36fb21e`tlogo-ui.png"
$publicTree = New-GitTree $publicEntries

$rootEntries = @(git ls-tree origin/main) | Where-Object {
  -not ($_.EndsWith("`tindex.html") -or $_.EndsWith("`tpublic") -or $_.EndsWith("`tsrc"))
}
$rootEntries += "100644 blob 37728fc5d40180e946b6f84b94ca964e4985d72d`tindex.html"
$rootEntries += "040000 tree $publicTree`tpublic"
$rootEntries += "040000 tree $srcTree`tsrc"
$rootTree = New-GitTree $rootEntries

$commit = "Yaz kampanyası ve kadro tasarımını yenile" | git commit-tree $rootTree -p origin/main
git update-ref refs/heads/agent/summer-squad-refresh $commit

Write-Output "COMMIT=$commit"
git diff --stat origin/main $commit
git diff --check origin/main $commit
