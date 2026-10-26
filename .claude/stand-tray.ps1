# Claude Stand: Build, Test and Install script for the native stand-tray.exe.
# Data: the files stand-statusline.ps1 writes to ~/.claude/stand.
# Run with -Install to set up shortcuts and autostart, -Test to verify the app.
param([switch]$Test, [switch]$Install)

function Build-Stand {
  $framework = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
  $csc = Join-Path $framework 'csc.exe'
  $cs = Join-Path $PSScriptRoot 'stand-tray.cs'
  $exe = Join-Path $PSScriptRoot 'stand-tray.exe'
  $ico = Join-Path $PSScriptRoot 'stand-tray.ico'

  $procs = Get-Process -Name 'stand-tray' -ErrorAction SilentlyContinue | Where-Object {
    try { $_.Path -eq $exe } catch { $true }
  }
  if ($procs) {
    $procs | Stop-Process -Force -ErrorAction SilentlyContinue
    $procs | ForEach-Object { try { $_.WaitForExit(3000) } catch {} }
  }

  $refs = @(
    (Join-Path $framework 'WPF\PresentationFramework.dll'),
    (Join-Path $framework 'WPF\PresentationCore.dll'),
    (Join-Path $framework 'WPF\WindowsBase.dll'),
    (Join-Path $framework 'System.Xaml.dll'),
    (Join-Path $framework 'System.Web.Extensions.dll'),
    (Join-Path $framework 'System.Windows.Forms.dll'),
    (Join-Path $framework 'System.Drawing.dll'),
    (Join-Path $framework 'System.Core.dll')
  )
  $cscArgs = @('/nologo', '/target:winexe', '/optimize+', "/win32icon:$ico", "/out:$exe")
  foreach ($r in $refs) { $cscArgs += "/r:$r" }
  $cscArgs += $cs

  $out = & $csc $cscArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "csc-Kompilierung fehlgeschlagen:`n$($out -join "`n")"
  }
  return $exe
}

if ($Test) {
  $exe = Build-Stand
  $fail = 0
  function Check($ok, $what) { if (-not $ok) { Write-Host "FEHLER: $what"; $script:fail++ } }

  # Unit tests in C# without UI
  $tmpUnit = Join-Path ([IO.Path]::GetTempPath()) "stand-test-unit-$([guid]::NewGuid()).txt"
  $p1 = Start-Process -FilePath $exe -ArgumentList @('--test', "`"$tmpUnit`"") -Wait -PassThru -NoNewWindow
  $unitOut = if (Test-Path $tmpUnit) { Get-Content -LiteralPath $tmpUnit } else { @() }
  if (Test-Path $tmpUnit) { Remove-Item -LiteralPath $tmpUnit -Force }
  if ($p1.ExitCode -ne 0) {
    Write-Host ($unitOut -join "`n")
    Write-Host "$($p1.ExitCode) Fehler bei Unit-Tests"
    exit 1
  }

  # End to end: the status line reads a transcript, the tray adds up what it wrote.
  $tmp = Join-Path ([IO.Path]::GetTempPath()) "stand-test-$([guid]::NewGuid())"
  New-Item -ItemType Directory $tmp | Out-Null
  $env:CLAUDE_STAND_DIR = $tmp
  $env:CLAUDE_STAND_URL = 'http://127.0.0.1:9/push'
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $old = [DateTime]::UtcNow.AddDays(-2).ToString('o')
  $msg = { param($id, $i, $o, $ts = $old) "{`"message`":{`"id`":`"$id`",`"role`":`"assistant`",`"usage`":{`"input_tokens`":$i,`"cache_creation_input_tokens`":20,`"cache_read_input_tokens`":30,`"output_tokens`":$o,`"iterations`":[{`"input_tokens`":777}]}},`"type`":`"assistant`",`"timestamp`":`"$ts`"}" }
  $transcript = Join-Path $tmp 'transcript.jsonl'
  $lines = @(
    "{`"type`":`"user`",`"message`":{`"role`":`"user`",`"content`":`"{\`"usage\`":{\`"input_tokens\`":999}}`"},`"timestamp`":`"$old`"}"
    (& $msg 'msg_A' 10 5), (& $msg 'msg_A' 10 5), (& $msg 'msg_B' 1 2)
  )
  [IO.File]::WriteAllText($transcript, ($lines -join "`n") + "`n" + (& $msg 'msg_C' 100 10 ([DateTime]::UtcNow.ToString('o'))))  # last line still being written
  $run = {
    param($cost)
    $p = @{ session_id = 'test'; session_name = 'Mein Chat'; transcript_path = $transcript; model = @{ display_name = 'Opus 5.5' }; cost = @{ total_cost_usd = $cost }
            rate_limits = @{ five_hour = @{ used_percentage = 12; resets_at = $now + 100 }; seven_day = @{ used_percentage = 34; resets_at = $now + 9999 } } }
    $p | ConvertTo-Json -Depth 4 -Compress | powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'stand-statusline.ps1')
  }
  $null = & $run 0.5
  $s = Get-Content (Join-Path $tmp 'test.json') -Raw | ConvertFrom-Json
  Check ($s.name -eq 'Mein Chat') "test.json hat name Mein Chat"
  $k = if (Test-Path (Join-Path $tmp 'key')) { (Get-Content (Join-Path $tmp 'key') -Raw).Trim() } else { '' }
  Check ($k -match '^[0-9a-f]{64}$') "key existiert und ist 64 Hex-Zeichen ($k)"
  Check ($s.in -eq 111 -and $s.out -eq 7) "Statuszeile: msg_A einmal, halbe Zeile wartet ($($s.in)/$($s.out))"
  [IO.File]::AppendAllText($transcript, "`n")
  $out = & $run 0.75
  $s = Get-Content (Join-Path $tmp 'test.json') -Raw | ConvertFrom-Json
  Check ($s.in -eq 261 -and $s.out -eq 17) "Statuszeile: nur neue Zeilen ($($s.in)/$($s.out))"
  Check ("$out" -match '0,75 \$' -and "$out" -match '5h') "Statuszeile druckt Kosten und Limits: $out"

  $tmpSumme = Join-Path ([IO.Path]::GetTempPath()) "stand-test-summe-$([guid]::NewGuid()).txt"
  $p2 = Start-Process -FilePath $exe -ArgumentList @('--test', "`"$tmpSumme`"", "`"$tmp`"") -Wait -PassThru -NoNewWindow
  $res2 = if (Test-Path $tmpSumme) { Get-Content -LiteralPath $tmpSumme } else { @() }
  if (Test-Path $tmpSumme) { Remove-Item -LiteralPath $tmpSumme -Force }
  if ($p2.ExitCode -ne 0) {
    Write-Host ($res2 -join "`n")
    $fail++
  }
  $summeLine = @($res2 | Where-Object { $_ -like 'summe *' })[0]
  Check ($summeLine -eq 'summe heute=0.25;tokens=160;woche=0.75;wochentokens=278;fuenf=12;wochenpct=34') "Tray liest die Datei ($summeLine)"

  Remove-Item -Recurse -Force $tmp
  if ($fail) { Write-Host "$fail Fehler"; exit 1 }
  Write-Host 'Alles in Ordnung'
  exit 0
}

if ($Install) {
  # 1. Stop running tray copies
  Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object {
    $_.CommandLine -like '*stand-tray.ps1*' -and $_.CommandLine -notlike '*-Install*' -and $_.CommandLine -notlike '*-Test*'
  } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

  Get-Process -Name 'stand-tray' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

  # 2. Build-Stand
  $exe = Build-Stand

  # 3. Delete old autostart shortcut
  $oldLnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'Claude Stand.lnk'
  if (Test-Path -LiteralPath $oldLnk) { Remove-Item -LiteralPath $oldLnk -Force }

  # 4. Set Run registry value
  Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' 'Claude Stand' "`"$exe`" --leise"

  # 5. (Re)create Start menu shortcut
  $programs = [Environment]::GetFolderPath('Programs')
  $lnkPath = Join-Path $programs 'Claude Stand.lnk'
  $wsh = New-Object -ComObject WScript.Shell
  $lnk = $wsh.CreateShortcut($lnkPath)
  $lnk.TargetPath = $exe
  $lnk.Arguments = ''
  $lnk.IconLocation = "$exe,0"
  $lnk.Description = 'Claude-Limits und Verbrauch im Infobereich'
  $lnk.Save()

  # 6. Start the exe
  Start-Process -FilePath $exe

  # 7. Promote new tray icon once
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    $k = @(Get-ChildItem 'HKCU:\Control Panel\NotifyIconSettings' -ErrorAction SilentlyContinue | Where-Object {
      (Get-ItemProperty $_.PSPath).ExecutablePath -like '*stand-tray.exe'
    })
    if ($k) {
      $k | ForEach-Object { Set-ItemProperty $_.PSPath IsPromoted 1 -Type DWord }
      break
    }
  }
  exit 0
}

Build-Stand | Out-Null
