# Optimize-Photos_Win_v2.ps1
# ASCII only. Safe quoting. Works on Windows PowerShell and PowerShell 7.

$ErrorActionPreference = "Stop"

function Has-Cmd([string]$cmd){ return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue) }
function Ensure-Dir([string]$p){ if(-not (Test-Path $p)){ New-Item -ItemType Directory -Path $p -Force | Out-Null } }
function Write-Text([string]$p,[string]$t){
  $dir = Split-Path -Parent $p
  if($dir -and -not (Test-Path $dir)){ New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Set-Content $p $t -Encoding UTF8
}

# Detect Node major to avoid Squoosh on Node 25
$NODE_MAJOR = $null
try {
  $nv = (& node -v) -replace '[^0-9\.]'
  if($nv){ $NODE_MAJOR = [int]($nv.Split('.')[0]) }
} catch {}

$PHOTOS = "src/assets/photos"
Ensure-Dir $PHOTOS

# Base images: ignore placeholder.* and any -640/-960/-1280 derivatives
$baseFiles = Get-ChildItem "$PHOTOS\*" -File -Include *.webp,*.jpg,*.jpeg,*.png,*.avif |
  Where-Object { $_.Name -notmatch '^placeholder\.' -and $_.Name -notmatch '-(640|960|1280)\.(webp|avif)$' } |
  Sort-Object Name

if(-not $baseFiles){
  Write-Host "No base images found in $PHOTOS"
  exit 0
}

$WIDTHS = @(1280,960,640)

$HAS_MAGICK   = Has-Cmd "magick"
$HAS_CWEBP    = Has-Cmd "cwebp"

$CAN_SQUOOSH  = $false
if($NODE_MAJOR -and ($NODE_MAJOR % 2 -ne 0)){
  # odd Node (e.g., 25) - disable squoosh to avoid wasm fetch errors
  $CAN_SQUOOSH = $false
} else {
  try { & npx @squoosh/cli -h | Out-Null; $CAN_SQUOOSH = $true } catch {}
}

if(-not $HAS_MAGICK -and -not $HAS_CWEBP -and -not $CAN_SQUOOSH){
  Write-Host "No optimizer found. Install one of:"
  Write-Host "  - ImageMagick:  winget install -e --id ImageMagick.ImageMagick"
  Write-Host "  - cwebp (WebP): winget install -e --id WebP.WebP"
  Write-Host "  - Squoosh:      npm i -g @squoosh/cli  (PowerShell may still block on Node 25)"
  exit 1
}

function Out-WebP-Magick($src,$dst,$w){
  & magick "$src" -auto-orient -strip -filter Lanczos -resize "${w}x" -define webp:method=6 -quality 82 "$dst"
}
function Out-AVIF-Magick($src,$dst,$w){
  & magick "$src" -auto-orient -strip -filter Lanczos -resize "${w}x" -define heic:encoder=avif -define heic:speed=6 -define heic:quality=30 "$dst"
}
function Out-WebP-Cwebp($src,$dst,$w){
  & cwebp -quiet -q 82 -m 4 -resize $w 0 "$src" -o "$dst"
}
function Out-WebP-Squoosh($src,$dst,$w){
  $outDir = Split-Path $dst -Parent
  & npx @squoosh/cli --webp '{"quality":82,"effort":4}' --resize "{`"width`":$w,`"method`":`"lanczos3`"}" -d $outDir "$src"
  $tmp = Join-Path $outDir ((Get-Item $src).BaseName + ".webp")
  if(Test-Path $tmp){ Move-Item $tmp $dst -Force }
}
function Out-AVIF-Squoosh($src,$dst,$w){
  $outDir = Split-Path $dst -Parent
  & npx @squoosh/cli --avif '{"cqLevel":28,"effort":3}' --resize "{`"width`":$w,`"method`":`"lanczos3`"}" -d $outDir "$src"
  $tmp = Join-Path $outDir ((Get-Item $src).BaseName + ".avif")
  if(Test-Path $tmp){ Move-Item $tmp $dst -Force }
}

$madeAny = $false

foreach($f in $baseFiles){
  $baseNoExt = Join-Path $PHOTOS ([IO.Path]::GetFileNameWithoutExtension($f.Name))
  foreach($w in $WIDTHS){
    $dstWebp = "${baseNoExt}-${w}.webp"
    $dstAvif = "${baseNoExt}-${w}.avif"

    # WEBP
    $needWebp = (-not (Test-Path $dstWebp)) -or ((Get-Item $dstWebp).LastWriteTime -lt $f.LastWriteTime)
    if($needWebp){
      try{
        if($HAS_MAGICK){ Out-WebP-Magick $f.FullName $dstWebp $w }
        elseif($HAS_CWEBP){ Out-WebP-Cwebp $f.FullName $dstWebp $w }
        elseif($CAN_SQUOOSH){ Out-WebP-Squoosh $f.FullName $dstWebp $w }
        Write-Host ("WEBP OK: {0} -> {1}" -f $f.Name, (Split-Path $dstWebp -Leaf))
        $madeAny = $true
      } catch {
        Write-Host ("WEBP FAIL: {0} @{1}px :: {2}" -f $f.Name,$w,$_.Exception.Message)
      }
    }

    # AVIF only when Magick or Squoosh is available
    if($HAS_MAGICK -or $CAN_SQUOOSH){
      $needAvif = (-not (Test-Path $dstAvif)) -or ((Get-Item $dstAvif).LastWriteTime -lt $f.LastWriteTime)
      if($needAvif){
        try{
          if($HAS_MAGICK){ Out-AVIF-Magick $f.FullName $dstAvif $w }
          else { Out-AVIF-Squoosh $f.FullName $dstAvif $w }
          Write-Host ("AVIF OK: {0} -> {1}" -f $f.Name, (Split-Path $dstAvif -Leaf))
          $madeAny = $true
        } catch {
          Write-Host ("AVIF FAIL: {0} @{1}px :: {2}" -f $f.Name,$w,$_.Exception.Message)
        }
      }
    }
  }
}

# Update environments with base photos list
function Update-EnvPhotos($envPath){
  if(-not (Test-Path $envPath)){ return }
  $raw = Get-Content $envPath -Raw

  $basesForEnv = Get-ChildItem "$PHOTOS\*" -File -Include *.webp,*.jpg,*.jpeg,*.png,*.avif |
    Where-Object { $_.Name -notmatch '^placeholder\.' -and $_.Name -notmatch '-(640|960|1280)\.(webp|avif)$' } |
    Sort-Object Name |
    ForEach-Object { "'assets/photos/$($_.Name)'" } -join ", "

  if($raw -match 'photos:\s*\[[^\]]*\]'){
    $raw = [regex]::Replace($raw, 'photos:\s*\[[^\]]*\]', "photos: [$basesForEnv]")
  } else {
    if($raw -match 'giftListUrl'){
      $raw = [regex]::Replace($raw, '(giftListUrl\s*:\s*[^,]+,)', "photos: [$basesForEnv],`r`n  `$1")
    } elseif($raw -match 'theme\s*:\s*\{[^\}]*\}'){
      $raw = [regex]::Replace($raw, '(theme\s*:\s*\{[^\}]*\}\s*,)', "`$1`r`n  photos: [$basesForEnv],")
    } else {
      $raw = [regex]::Replace($raw, '(\{\s*)', "`$1`r`n  photos: [$basesForEnv],")
    }
  }

  Write-Text $envPath $raw
  Write-Host "Updated photos[] in $envPath"
}

Update-EnvPhotos "src/environments/environment.ts"
Update-EnvPhotos "src/environments/environment.prod.ts"

if($madeAny){
  Write-Host "Done. Derivatives created/updated."
} else {
  Write-Host "Nothing to do. Derivatives already up-to-date."
}
