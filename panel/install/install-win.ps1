# PostKit installer for Windows — copies the panel into Premiere's extensions
# folder, allows unsigned panels, and downloads ffmpeg.
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$Src = Split-Path -Parent $PSScriptRoot
$Dest = Join-Path $env:APPDATA "Adobe\CEP\extensions\PostKit"

Write-Host "Installing PostKit..."
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
foreach ($item in @("CSXS", "css", "js", "jsx", "index.html", ".debug")) {
  $target = Join-Path $Dest $item
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  Copy-Item -Recurse -Force (Join-Path $Src $item) $target
}
$Bin = Join-Path $Dest "bin"
New-Item -ItemType Directory -Force -Path $Bin | Out-Null

# Premiere only loads unsigned panels with debug mode on.
foreach ($v in 11, 12, 13) {
  $key = "HKCU:\Software\Adobe\CSXS.$v"
  New-Item -Force -Path $key | Out-Null
  Set-ItemProperty -Path $key -Name "PlayerDebugMode" -Value "1"
}

$Ffmpeg = Join-Path $Bin "ffmpeg.exe"
if (-not (Test-Path $Ffmpeg)) {
  Write-Host "Downloading ffmpeg (about 110 MB, one time)..."
  $Tmp = Join-Path $env:TEMP ("postkit-" + [guid]::NewGuid())
  New-Item -ItemType Directory -Force -Path $Tmp | Out-Null
  $Zip = Join-Path $Tmp "ffmpeg.zip"
  Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $Zip
  Expand-Archive -Path $Zip -DestinationPath $Tmp -Force
  $Exe = Get-ChildItem -Path $Tmp -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
  Copy-Item $Exe.FullName $Ffmpeg
  Remove-Item -Recurse -Force $Tmp
}

& $Ffmpeg -hide_banner -version | Select-Object -First 1
Write-Host ""
Write-Host "Done. Quit and reopen Premiere Pro, then open Window > Extensions > PostKit."
