# Claude Stand in the Windows tray: the icon shows the 5-hour %, a click opens the meter with both limits and
# today's and this week's API value and tokens. Data: the files stand-statusline.ps1 writes to ~/.claude/stand.
# Start: Start menu entry from -Install (opens the meter), -Leise starts without opening it. Check: -Test
param([switch]$Test, [switch]$Install, [switch]$Leise)

$store = if ($env:CLAUDE_STAND_DIR) { $env:CLAUDE_STAND_DIR } else { Join-Path $HOME '.claude\stand' }
$stand = 'https://spanani.de/c-r8kq2wv5zn/'
$de = [Globalization.CultureInfo]::GetCultureInfo('de-DE')

function Read-Sessions($dir, $cache) {
  foreach ($f in Get-ChildItem -LiteralPath $dir -Filter *.json -ErrorAction SilentlyContinue) {
    if ($cache[$f.FullName].t -eq $f.LastWriteTimeUtc) { continue }
    # A file the status line is writing this very moment does not parse; its last good copy stays.
    try { $o = Get-Content -LiteralPath $f.FullName -Raw | ConvertFrom-Json } catch { $o = $null }
    if ($o) { $o | Add-Member id $f.BaseName -Force; $cache[$f.FullName] = @{ t = $f.LastWriteTimeUtc; o = $o } }
  }
  foreach ($v in $cache.Values) { $v.o }
}

function Get-Limit($sessions, $pct, $reset, [long]$now) {
  # The newest window wins. Within a window use only grows, so the highest reading counts:
  # a session that has been quiet for a while still reports its last, lower value.
  $w = @($sessions | Where-Object { $_.$reset })
  if (-not $w) { return @{ pct = $null; reset = $null } }
  $top = [long]($w | Measure-Object $reset -Maximum).Maximum
  if ($top -le $now) { return @{ pct = 0; reset = $null } }
  @{ pct = [int][math]::Round(($w | Where-Object { $_.$reset -ge $top - 60 } | Measure-Object $pct -Maximum).Maximum); reset = $top }
}

function Get-Stand($sessions, [long]$now) {
  $five = Get-Limit $sessions five fiveReset $now
  $week = Get-Limit $sessions week weekReset $now
  $local = [DateTimeOffset]::FromUnixTimeSeconds($now).LocalDateTime
  $today = $local.ToString('yyyy-MM-dd')
  $from = if ($week.reset) { [DateTimeOffset]::FromUnixTimeSeconds($week.reset - 604800).LocalDateTime } else { $local.AddDays(-7) }
  $from = $from.ToString('yyyy-MM-ddTHH')
  $r = [ordered]@{ five = $five; week = $week; todayCost = 0.0; todayTokens = [long]0; weekCost = 0.0; weekTokens = [long]0; costs = @{}; last = $null }
  foreach ($s in $sessions) {
    $r.costs[$s.id] = [double]$s.cost
    if (-not $r.last -or $s.updated -gt $r.last.updated) { $r.last = $s }
    foreach ($p in $s.hours.PSObject.Properties) {
      $v = @($p.Value)
      if ($p.Name.StartsWith($today)) { $r.todayCost += $v[2]; $r.todayTokens += $v[0] + $v[1] }
      if ($p.Name -ge $from) { $r.weekCost += $v[2]; $r.weekTokens += $v[0] + $v[1] }
    }
  }
  [pscustomobject]$r
}

function Get-Rate($samples) {
  # $ per hour over the samples (the last 5 minutes). Each session counts from the first sample it shows up in,
  # so a session that reports for the first time with a long history does not look like spending.
  if ($samples.Count -lt 2 -or $samples[$samples.Count - 1].t - $samples[0].t -lt 60) { return $null }
  $first = @{}
  foreach ($x in $samples) { foreach ($k in $x.costs.Keys) { if (-not $first.ContainsKey($k)) { $first[$k] = $x.costs[$k] } } }
  $last = $samples[$samples.Count - 1]
  $sum = 0.0
  foreach ($k in $last.costs.Keys) { $sum += [math]::Max(0.0, $last.costs[$k] - $first[$k]) }
  $sum / ($last.t - $samples[0].t) * 3600
}

function Format-Geld([double]$v) { $v.ToString('#,0.00', $de) + ' $' }
function Format-Tokens([double]$n) {
  if ($n -ge 1e9) { ($n / 1e9).ToString('0.0', $de) + ' Mrd.' }
  elseif ($n -ge 1e6) { ($n / 1e6).ToString('0.0', $de) + ' Mio.' }
  elseif ($n -ge 1e3) { ($n / 1e3).ToString('0', $de) + ' Tsd.' }
  else { $n.ToString('0', $de) }
}
function Format-Reset($limit, [long]$now) {
  if ($null -eq $limit.pct) { return 'Noch keine Messung' }
  if (-not $limit.reset) { return 'Wieder frei' }
  $t = [TimeSpan]::FromSeconds($limit.reset - $now)
  if ($t.TotalHours -ge 24) { return 'Reset ' + [DateTimeOffset]::FromUnixTimeSeconds($limit.reset).LocalDateTime.ToString('ddd HH:mm', $de) }
  if ($t.Hours) { "Reset in $($t.Hours) h $($t.Minutes) min" } else { "Reset in $([math]::Max(1, $t.Minutes)) min" }
}
function Format-Vor([long]$s) {
  if ($s -lt 60) { "vor $([math]::Max(1, $s)) s" }
  elseif ($s -lt 3600) { "vor $([math]::Floor($s / 60)) min" }
  elseif ($s -lt 86400) { "vor $([math]::Floor($s / 3600)) h" }
  elseif ($s -lt 172800) { 'gestern' }
  else { "vor $([math]::Floor($s / 86400)) Tagen" }
}

if ($Test) {
  $fail = 0
  function Check($ok, $what) { if (-not $ok) { Write-Host "FEHLER: $what"; $script:fail++ } }
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $key = { param($ago) [DateTimeOffset]::FromUnixTimeSeconds($now - $ago).LocalDateTime.ToString('yyyy-MM-ddTHH') }
  $h = [pscustomobject]@{}
  $h | Add-Member (& $key 0) @(1000, 100, 1.5)
  $h | Add-Member (& $key (2 * 86400)) @(500, 50, 0.5)
  $h | Add-Member (& $key (8 * 86400)) @(9, 9, 9)
  $a = [pscustomobject]@{ id = 'a'; updated = $now - 30; cost = 3; five = 40; fiveReset = $now + 3600; week = 20; weekReset = $now + 86400; hours = $h }
  $b = [pscustomobject]@{ id = 'b'; updated = $now - 600; cost = 1; five = 35; fiveReset = $now + 3600; week = 22; weekReset = $now + 86430; hours = [pscustomobject]@{ (& $key 0) = @(10, 0, 0.25) } }
  $c = [pscustomobject]@{ id = 'c'; updated = $now - 90000; cost = 9; five = 99; fiveReset = $now - 7200; week = 99; weekReset = $now - 6 * 86400; hours = [pscustomobject]@{} }
  $r = Get-Stand @($a, $b, $c) $now
  Check ($r.five.pct -eq 40 -and $r.five.reset -eq $now + 3600) "5h: hoechster Wert im neuesten Fenster ($($r.five.pct))"
  Check ($r.week.pct -eq 22) "Woche: Fenster mit 30 s Abweichung zaehlt mit ($($r.week.pct))"
  Check ([math]::Abs($r.todayCost - 1.75) -lt 1e-9 -and $r.todayTokens -eq 1110) "heute ($($r.todayCost), $($r.todayTokens))"
  Check ([math]::Abs($r.weekCost - 2.25) -lt 1e-9 -and $r.weekTokens -eq 1660) "Woche ohne 8 Tage alte Stunde ($($r.weekCost), $($r.weekTokens))"
  Check ($r.last -eq $a -and $r.costs.b -eq 1) 'letzte Sitzung und Kosten je Sitzung'
  $samples = @(@{ t = 0; costs = @{ a = 1.0 } }, @{ t = 60; costs = @{ a = 1.5; b = 40.0 } }, @{ t = 120; costs = @{ a = 2.0; b = 40.5 } })
  Check ((Get-Rate $samples) -eq 45) "Tempo: neue Sitzung zaehlt ab ihrem ersten Auftauchen ($(Get-Rate $samples))"
  Check ($null -eq (Get-Rate @($samples[0], $samples[0]))) 'Tempo erst nach einer Minute'
  Check ((Get-Limit @($c) five fiveReset $now).pct -eq 0) 'abgelaufenes Fenster zeigt 0'
  Check ($null -eq (Get-Limit @() five fiveReset $now).pct) 'ohne Messung kein Wert'
  Check ((Format-Tokens 14234567) -eq '14,2 Mio.' -and (Format-Geld 1234.5) -eq '1.234,50 $') 'Zahlenformat'
  Check ((Format-Reset @{ pct = 5; reset = $now + 2 * 3600 + 14 * 60 + 30 } $now) -eq 'Reset in 2 h 14 min') 'Reset-Text'

  # End to end: the status line reads a transcript, the tray adds up what it wrote.
  $tmp = Join-Path ([IO.Path]::GetTempPath()) "stand-test-$([guid]::NewGuid())"
  New-Item -ItemType Directory $tmp | Out-Null
  $env:CLAUDE_STAND_DIR = $tmp
  $env:CLAUDE_STAND_URL = 'http://127.0.0.1:9/push'
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
    $p = @{ session_id = 'test'; transcript_path = $transcript; model = @{ display_name = 'Opus 5.5' }; cost = @{ total_cost_usd = $cost }
            rate_limits = @{ five_hour = @{ used_percentage = 12; resets_at = $now + 100 }; seven_day = @{ used_percentage = 34; resets_at = $now + 9999 } } }
    $p | ConvertTo-Json -Depth 4 -Compress | powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'stand-statusline.ps1')
  }
  $null = & $run 0.5
  $s = Get-Content (Join-Path $tmp 'test.json') -Raw | ConvertFrom-Json
  Check ($s.in -eq 111 -and $s.out -eq 7) "Statuszeile: msg_A einmal, halbe Zeile wartet ($($s.in)/$($s.out))"
  [IO.File]::AppendAllText($transcript, "`n")
  $out = & $run 0.75
  $s = Get-Content (Join-Path $tmp 'test.json') -Raw | ConvertFrom-Json
  Check ($s.in -eq 261 -and $s.out -eq 17) "Statuszeile: nur neue Zeilen ($($s.in)/$($s.out))"
  Check ("$out" -match '0,75 \$' -and "$out" -match '5h') "Statuszeile druckt Kosten und Limits: $out"
  $r = Get-Stand @(Read-Sessions $tmp @{}) $now
  Check ([math]::Abs($r.todayCost - 0.25) -lt 1e-9 -and $r.todayTokens -eq 160) "Kosten der ersten Messung gehen in die Stunden ihrer Tokens ($($r.todayCost), $($r.todayTokens))"
  Check ([math]::Abs($r.weekCost - 0.75) -lt 1e-9 -and $r.weekTokens -eq 278 -and $r.five.pct -eq 12 -and $r.week.pct -eq 34) "Tray liest die Datei ($($r.weekCost), $($r.weekTokens))"
  Remove-Item -Recurse -Force $tmp
  if ($fail) { Write-Host "$fail Fehler"; exit 1 }
  Write-Host 'Alles in Ordnung'
  exit 0
}

$psExe = (Get-Process -Id $PID).Path
$launch = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
$autostart = Join-Path ([Environment]::GetFolderPath('Startup')) 'Claude Stand.lnk'
function New-Verknuepfung($path, $extra) {
  $l = (New-Object -ComObject WScript.Shell).CreateShortcut($path)
  $l.TargetPath = $psExe
  $l.Arguments = if ($extra) { "$launch $extra" } else { $launch }
  $l.IconLocation = Join-Path $PSScriptRoot 'stand-tray.ico'
  $l.Description = 'Claude-Limits und Verbrauch im Infobereich'
  $l.Save()
}
if ($Install) {
  New-Verknuepfung (Join-Path ([Environment]::GetFolderPath('Programs')) 'Claude Stand.lnk')
  New-Verknuepfung $autostart '-Leise'
  Start-Process $psExe $launch
  # Windows 11 puts new tray icons into the overflow; show this one on the taskbar once, right after it first appears.
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    $k = @(Get-ChildItem 'HKCU:\Control Panel\NotifyIconSettings' -ErrorAction SilentlyContinue | Where-Object { (Get-ItemProperty $_.PSPath).InitialTooltip -like 'Claude*' })
    if ($k) { $k | ForEach-Object { Set-ItemProperty $_.PSPath IsPromoted 1 -Type DWord }; break }
  }
  exit
}

# One copy only. Starting it again (Start menu) tells the running copy to open the meter.
$wecker = New-Object Threading.EventWaitHandle($false, 'AutoReset', 'claude-stand-tray-open')
$one = New-Object Threading.Mutex($false, 'claude-stand-tray')
try { $first = $one.WaitOne(0) } catch [Threading.AbandonedMutexException] { $first = $true }
if (-not $first) { $null = $wecker.Set(); exit }

Add-Type -AssemblyName PresentationFramework, System.Windows.Forms, System.Drawing
Add-Type -Namespace Stand -Name Native -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
[DllImport("user32.dll")] public static extern bool DestroyIcon(IntPtr handle);
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, System.Text.StringBuilder name, int max);
'@
$null = [Stand.Native]::SetProcessDPIAware()
Get-ChildItem -LiteralPath $store -Filter *.json -ErrorAction SilentlyContinue | Where-Object LastWriteTime -lt (Get-Date).AddDays(-35) | Remove-Item

# Colors of the Stand page ("Zaehlerstand"), light and dark like the taskbar.
$farben = @{
  dunkel = @{
    Gehaeuse = '#101315'; Deckel = '#181c20'; DeckelRaised = '#20252a'; Schild = '#eaede8';
    Beschriftung = '#8d959c'; Linie = '#2d333a'; LinieSubtle = '#20252b'; Zaehlwerk = '#090b0d';
    Ziffer = '#f5f6f2'; Rot = '#f03542'; RotDrum = '#c81e2b'; Gruen = '#2ecc71'
  }
  hell   = @{
    Gehaeuse = '#e4e6e2'; Deckel = '#f3f5f1'; DeckelRaised = '#ffffff'; Schild = '#181c1f';
    Beschriftung = '#5b6267'; Linie = '#c7cbc5'; LinieSubtle = '#d8dcd6'; Zaehlwerk = '#0f1214';
    Ziffer = '#f6f7f3'; Rot = '#e02835'; RotDrum = '#c81d2a'; Gruen = '#1e8e5a'
  }
}
$pinsel = New-Object Windows.Media.BrushConverter
$motion = [Windows.SystemParameters]::ClientAreaAnimation

$app = New-Object Windows.Application
$app.ShutdownMode = 'OnExplicitShutdown'
$win = [Windows.Markup.XamlReader]::Parse(@'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Usage Monitor for Claude" Width="340" SizeToContent="Height" WindowStyle="None" AllowsTransparency="True"
        Background="Transparent" ResizeMode="NoResize" ShowInTaskbar="False" Topmost="True" Left="-3000" Top="0"
        FontFamily="Segoe UI, -apple-system, sans-serif" FontSize="13" Foreground="#f8fafc" UseLayoutRounding="True">
  <Border Margin="14" Background="#14171f" BorderBrush="#252a36" BorderThickness="1" CornerRadius="10" Padding="16,14">
    <Border.Effect><DropShadowEffect BlurRadius="24" ShadowDepth="6" Direction="270" Opacity="0.6" Color="Black"/></Border.Effect>
    <StackPanel>
      <!-- Title & Close -->
      <DockPanel Margin="0,0,0,12">
        <Button x:Name="Schliessen" DockPanel.Dock="Right" Background="Transparent" BorderThickness="0" Foreground="#64748b" FontSize="13" FontWeight="Bold" Cursor="Hand" Content="✕"/>
        <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
          <Ellipse x:Name="Pilot" Width="8" Height="8" Fill="#10b981" Margin="0,0,8,0"/>
          <TextBlock Text="Usage Monitor for Claude" FontWeight="Bold" FontSize="13" Foreground="#f8fafc"/>
        </StackPanel>
      </DockPanel>

      <!-- ACCOUNT -->
      <TextBlock Text="ACCOUNT" FontSize="10" FontWeight="Bold" Foreground="#64748b" Margin="0,0,0,5"/>
      <DockPanel Margin="0,0,0,4">
        <TextBlock Text="Plan" Foreground="#94a3b8" FontSize="12.5"/>
        <TextBlock Text="Claude Pro" Foreground="#facc15" FontWeight="SemiBold" FontSize="12.5" HorizontalAlignment="Right"/>
      </DockPanel>
      <DockPanel Margin="0,0,0,12">
        <TextBlock Text="Model" Foreground="#94a3b8" FontSize="12.5"/>
        <TextBlock x:Name="Modell" Text="Claude" Foreground="#f8fafc" FontSize="12.5" HorizontalAlignment="Right"/>
      </DockPanel>

      <!-- USAGE -->
      <TextBlock Text="USAGE" FontSize="10" FontWeight="Bold" Foreground="#64748b" Margin="0,0,0,6"/>
      
      <!-- Session (5hr) -->
      <DockPanel Margin="0,0,0,4">
        <TextBlock Text="Session (5hr)" Foreground="#f8fafc" FontSize="12.5" FontWeight="SemiBold"/>
        <TextBlock x:Name="FivePct" Text="0%" Foreground="#f8fafc" FontSize="12.5" FontWeight="Bold" HorizontalAlignment="Right"/>
      </DockPanel>
      <Grid Height="8" Margin="0,0,0,4">
        <Border Background="#1f2430" CornerRadius="4"/>
        <Grid x:Name="FiveFillGrid">
          <Grid.ColumnDefinitions><ColumnDefinition Width="0*"/><ColumnDefinition Width="100*"/></Grid.ColumnDefinitions>
          <Border x:Name="FiveFill" Background="#3b82f6" CornerRadius="4"/>
        </Grid>
        <Grid x:Name="FiveTickGrid">
          <Grid.ColumnDefinitions><ColumnDefinition Width="0*"/><ColumnDefinition Width="100*"/></Grid.ColumnDefinitions>
          <Rectangle Width="2" Height="8" Fill="#ffffff" HorizontalAlignment="Right"/>
        </Grid>
      </Grid>
      <DockPanel Margin="0,0,0,10">
        <TextBlock x:Name="FiveReset" Text="Reset in 0h 0m" Foreground="#64748b" FontSize="11"/>
        <TextBlock x:Name="FiveRate" Text="" Foreground="#64748b" FontSize="11" HorizontalAlignment="Right"/>
      </DockPanel>

      <!-- Weekly (7 day) -->
      <DockPanel Margin="0,0,0,4">
        <TextBlock Text="Weekly (7 day)" Foreground="#f8fafc" FontSize="12.5" FontWeight="SemiBold"/>
        <TextBlock x:Name="WeekPct" Text="0%" Foreground="#f8fafc" FontSize="12.5" FontWeight="Bold" HorizontalAlignment="Right"/>
      </DockPanel>
      <Grid Height="8" Margin="0,0,0,4">
        <Border Background="#1f2430" CornerRadius="4"/>
        <Grid x:Name="WeekFillGrid">
          <Grid.ColumnDefinitions><ColumnDefinition Width="0*"/><ColumnDefinition Width="100*"/></Grid.ColumnDefinitions>
          <Border x:Name="WeekFill" Background="#f43f5e" CornerRadius="4"/>
        </Grid>
        <UniformGrid Columns="7">
          <Border BorderBrush="#14171f" BorderThickness="0,0,1,0"/>
          <Border BorderBrush="#14171f" BorderThickness="0,0,1,0"/>
          <Border BorderBrush="#14171f" BorderThickness="0,0,1,0"/>
          <Border BorderBrush="#14171f" BorderThickness="0,0,1,0"/>
          <Border BorderBrush="#14171f" BorderThickness="0,0,1,0"/>
          <Border BorderBrush="#14171f" BorderThickness="0,0,1,0"/>
          <Border/>
        </UniformGrid>
        <Grid x:Name="WeekTickGrid">
          <Grid.ColumnDefinitions><ColumnDefinition Width="0*"/><ColumnDefinition Width="100*"/></Grid.ColumnDefinitions>
          <Rectangle Width="2" Height="8" Fill="#ffffff" HorizontalAlignment="Right"/>
        </Grid>
      </Grid>
      <DockPanel Margin="0,0,0,12">
        <TextBlock x:Name="WeekReset" Text="Reset am ..." Foreground="#64748b" FontSize="11"/>
        <TextBlock x:Name="WeekBudget" Text="" Foreground="#64748b" FontSize="11" HorizontalAlignment="Right"/>
      </DockPanel>

      <!-- EXTRA USAGE / VALUE -->
      <TextBlock Text="API-GEGENWERT (PRO ARBITRAGE)" FontSize="10" FontWeight="Bold" Foreground="#64748b" Margin="0,0,0,5"/>
      <DockPanel Margin="0,0,0,4">
        <TextBlock Text="Heute" Foreground="#94a3b8" FontSize="12"/>
        <StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
          <TextBlock x:Name="HeuteGeld" Text="0,00 $" FontWeight="Bold" Foreground="#f8fafc" FontSize="12" Margin="0,0,6,0"/>
          <TextBlock x:Name="HeuteTokens" Text="0 Tokens" Foreground="#64748b" FontSize="11.5"/>
        </StackPanel>
      </DockPanel>
      <DockPanel Margin="0,0,0,12">
        <TextBlock Text="Diese Woche" Foreground="#94a3b8" FontSize="12"/>
        <StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
          <TextBlock x:Name="WocheGeld" Text="0,00 $" FontWeight="Bold" Foreground="#f8fafc" FontSize="12" Margin="0,0,6,0"/>
          <TextBlock x:Name="WocheTokens" Text="0 Tokens" Foreground="#64748b" FontSize="11.5"/>
        </StackPanel>
      </DockPanel>

      <!-- FOOTER -->
      <DockPanel Margin="0,4,0,0">
        <Button x:Name="Oeffnen" DockPanel.Dock="Right" Background="#202530" BorderBrush="#2e3544" BorderThickness="1" Foreground="#f8fafc" Padding="9,4" FontSize="11.5" Cursor="Hand" Content="Web App öffnen"/>
        <TextBlock x:Name="Zuletzt" VerticalAlignment="Center" FontSize="11" Foreground="#64748b" Text="Aktualisiert gerade eben"/>
      </DockPanel>
    </StackPanel>
  </Border>
</Window>
'@)
$ui = @{}
foreach ($n in 'Schliessen', 'Pilot', 'Modell', 'FivePct', 'FiveFillGrid', 'FiveFill', 'FiveTickGrid', 'FiveReset', 'FiveRate', 'WeekPct', 'WeekFillGrid', 'WeekFill', 'WeekTickGrid', 'WeekReset', 'WeekBudget', 'HeuteGeld', 'HeuteTokens', 'WocheGeld', 'WocheTokens', 'Oeffnen', 'Zuletzt') {
  $ui[$n] = $win.FindName($n)
}
$ui.Schliessen.Add_Click({ $win.Hide() })

$st = @{ cache = @{}; samples = New-Object Collections.ArrayList; r = $null; icon = $null; iconText = $null; toggled = [DateTime]::MinValue; left = [DateTime]::MinValue }

function Update-View {
  $r = $st.r
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  
  # Model & Pilot LED
  $active = $r.last -and ($now - $r.last.updated) -lt 180
  $ui.Pilot.Fill = $pinsel.ConvertFromString($(if ($active) { '#10b981' } else { '#f59e0b' }))
  $ui.Modell.Text = if ($r.last -and $r.last.model) { "$($r.last.model)" } else { 'Claude 3.7 Sonnet' }

  # Session (5hr)
  $n5 = if ($null -eq $r.five.pct) { 0 } else { [math]::Min(100, [math]::Max(0, $r.five.pct)) }
  $ui.FivePct.Text = "$n5%"
  $ui.FiveFillGrid.ColumnDefinitions[0].Width = New-Object Windows.GridLength($n5, 'Star')
  $ui.FiveFillGrid.ColumnDefinitions[1].Width = New-Object Windows.GridLength((100 - $n5), 'Star')
  $ui.FiveFill.Background = $pinsel.ConvertFromString($(if ($n5 -ge 90) { '#f43f5e' } elseif ($n5 -ge 75) { '#f59e0b' } else { '#3b82f6' }))
  
  # 5h pacing tick: time elapsed
  if ($r.five.reset) {
    $wSec = 18000
    $elSec = [math]::Max(0, [math]::Min($wSec, $wSec - ($r.five.reset - $now)))
    $elPct = [math]::Round(($elSec / $wSec) * 100)
    $ui.FiveTickGrid.ColumnDefinitions[0].Width = New-Object Windows.GridLength($elPct, 'Star')
    $ui.FiveTickGrid.ColumnDefinitions[1].Width = New-Object Windows.GridLength((100 - $elPct), 'Star')
    $ui.FiveTickGrid.Visibility = 'Visible'
  } else {
    $ui.FiveTickGrid.Visibility = 'Hidden'
  }
  $ui.FiveReset.Text = Format-Reset $r.five $now
  $rate = Get-Rate $st.samples
  $ui.FiveRate.Text = if ($rate -gt 0) { "+$([math]::Round($rate, 1)) %/h" } else { "" }

  # Weekly (7 day)
  $nw = if ($null -eq $r.week.pct) { 0 } else { [math]::Min(100, [math]::Max(0, $r.week.pct)) }
  $ui.WeekPct.Text = "$nw%"
  $ui.WeekFillGrid.ColumnDefinitions[0].Width = New-Object Windows.GridLength($nw, 'Star')
  $ui.WeekFillGrid.ColumnDefinitions[1].Width = New-Object Windows.GridLength((100 - $nw), 'Star')
  $ui.WeekFill.Background = $pinsel.ConvertFromString($(if ($nw -ge 90) { '#f43f5e' } elseif ($nw -ge 75) { '#f59e0b' } else { '#3b82f6' }))

  # Weekly pacing tick: week elapsed
  if ($r.week.reset) {
    $wSecW = 604800
    $elSecW = [math]::Max(0, [math]::Min($wSecW, $wSecW - ($r.week.reset - $now)))
    $elPctW = [math]::Round(($elSecW / $wSecW) * 100)
    $ui.WeekTickGrid.ColumnDefinitions[0].Width = New-Object Windows.GridLength($elPctW, 'Star')
    $ui.WeekTickGrid.ColumnDefinitions[1].Width = New-Object Windows.GridLength((100 - $elPctW), 'Star')
    $ui.WeekTickGrid.Visibility = 'Visible'
  } else {
    $ui.WeekTickGrid.Visibility = 'Hidden'
  }
  $ui.WeekReset.Text = Format-Reset $r.week $now

  # Value
  $ui.HeuteGeld.Text = Format-Geld $r.todayCost
  $ui.WocheGeld.Text = Format-Geld $r.weekCost
  $ui.HeuteTokens.Text = "$(Format-Tokens $r.todayTokens) Tokens"
  $ui.WocheTokens.Text = "$(Format-Tokens $r.weekTokens) Tokens"
  $ui.Zuletzt.Text = if ($r.last) { "Zuletzt $($r.last.project), $(Format-Vor ($now - $r.last.updated))" } else { 'Aktualisiert' }
}

function Set-TrayIcon($text, $alarm) {
  try {
    $px = [Windows.Forms.SystemInformation]::SmallIconSize.Width
    if ($px -lt 16) { $px = 16 }
    $bmp = New-Object System.Drawing.Bitmap($px, $px)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $bgHex = if ($alarm) { '#ef4444' } else { '#151821' }
    $bgCol = [System.Drawing.ColorTranslator]::FromHtml($bgHex)
    $brush = New-Object System.Drawing.SolidBrush($bgCol)

    $r = [int]($px * 0.22)
    $rect = New-Object System.Drawing.Rectangle(0, 0, ($px - 1), ($px - 1))
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
    $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)

    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(45, 255, 255, 255), 1)
    $g.DrawPath($pen, $path)

    $fSize = if ($text.Length -ge 3) { $px * 0.50 } elseif ($text.Length -eq 2) { $px * 0.62 } else { $px * 0.72 }
    $font = New-Object System.Drawing.Font('Bahnschrift', $fSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $txtHex = '#f8fafc'
    $txtCol = [System.Drawing.ColorTranslator]::FromHtml($txtHex)
    $textBrush = New-Object System.Drawing.SolidBrush($txtCol)
    $g.DrawString($text, $font, $textBrush, (New-Object System.Drawing.RectangleF(0, 0, $px, $px)), $sf)

    $hIcon = $bmp.GetHicon()
    $iconCopy = [System.Drawing.Icon]::FromHandle($hIcon).Clone()
    $oldIcon = $tray.Icon
    $tray.Icon = $iconCopy
    if ($oldIcon -and $oldIcon -ne $tray.Icon) { try { $oldIcon.Dispose() } catch {} }
    $null = [Stand.Native]::DestroyIcon($hIcon)

    $font.Dispose()
    $textBrush.Dispose()
    $pen.Dispose()
    $path.Dispose()
    $brush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
  } catch {}
}

function Update-Stand {
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $r = Get-Stand @(Read-Sessions $store $st.cache) $now
  $st.r = $r
  $null = $st.samples.Add(@{ t = $now; costs = $r.costs })
  while ($st.samples.Count -gt 2 -and $now - $st.samples[0].t -gt 300) { $st.samples.RemoveAt(0) }
  $text = if ($null -eq $r.five.pct) { '–' } else { "$($r.five.pct)" }
  if ($text -ne $st.iconText) { Set-TrayIcon $text ($r.five.pct -ge 90); $st.iconText = $text }
  $tray.Text = if ($null -eq $r.five.pct) { 'Claude Stand: noch keine Messung' } else { "Claude: 5 Stunden $($r.five.pct) %, Woche $($r.week.pct) %" }
  if ($win.IsVisible) { Update-View }
}

function Show-Stand {
  Update-View
  $win.Opacity = 0
  $win.Show()
  $win.UpdateLayout()
  $wa = [Windows.SystemParameters]::WorkArea
  $win.Left = $wa.Right - $win.ActualWidth - 6
  $win.Top = $wa.Bottom - $win.ActualHeight - 6
  $null = $win.Activate()
  if ($motion) {
    $win.BeginAnimation([Windows.Window]::OpacityProperty, (New-Object Windows.Media.Animation.DoubleAnimation(0, 1, [TimeSpan]::FromMilliseconds(120))))
  } else {
    $win.Opacity = 1
  }
}

# Losing the focus closes the meter, except to the taskbar: that press may be a click on the icon, which closes it
# itself. If no such click comes within 0.7 s, the press was somewhere else on the taskbar and the meter closes too.
$zu = New-Object Windows.Threading.DispatcherTimer -Property @{ Interval = [TimeSpan]::FromMilliseconds(60) }
$zu.Add_Tick({
    $zu.Stop()
    if (-not $win.IsVisible -or $win.IsActive) { return }
    $name = New-Object Text.StringBuilder 64
    $null = [Stand.Native]::GetClassName([Stand.Native]::GetForegroundWindow(), $name, 64)
    if ("$name" -like 'Shell_*TrayWnd' -and ([DateTime]::UtcNow - $st.left).TotalMilliseconds -lt 700) { $zu.Start() } else { $win.Hide() }
  })
$win.Add_Deactivated({ $st.left = [DateTime]::UtcNow; $zu.Start() })
$win.Add_KeyDown({ param($s, $e) if ($e.Key -eq 'Escape') { $win.Hide() } })
$ui.Oeffnen.Add_Click({ Start-Process $stand; $win.Hide() })

$tray = New-Object Windows.Forms.NotifyIcon
$icoInit = Join-Path $PSScriptRoot 'stand-tray.ico'
if (Test-Path $icoInit) { try { $tray.Icon = New-Object System.Drawing.Icon($icoInit) } catch {} }
$tray.Add_MouseClick({
    param($s, $e)
    if ($e.Button -ne 'Left') { return }
    # The second click of a double click keeps the meter open instead of closing it again.
    if (([DateTime]::UtcNow - $st.toggled).TotalMilliseconds -lt [Windows.Forms.SystemInformation]::DoubleClickTime) { if ($win.IsVisible) { $null = $win.Activate() }; return }
    $st.toggled = [DateTime]::UtcNow
    if ($win.IsVisible) { $win.Hide() } else { Show-Stand }
  })
$menu = New-Object Windows.Forms.ContextMenuStrip
$null = $menu.Items.Add('Stand im Browser öffnen', $null, { Start-Process $stand })
$auto = New-Object Windows.Forms.ToolStripMenuItem('Mit Windows starten')
$auto.Checked = Test-Path $autostart
$auto.Add_Click({ if (Test-Path $autostart) { Remove-Item $autostart } else { New-Verknuepfung $autostart '-Leise' }; $auto.Checked = Test-Path $autostart })
$null = $menu.Items.Add($auto)
$null = $menu.Items.Add('-')
$null = $menu.Items.Add('Beenden', $null, { $tray.Visible = $false; $tray.Dispose(); $app.Shutdown() })
$tray.ContextMenuStrip = $menu
Update-Stand
$tray.Visible = $true

$timer = New-Object Windows.Threading.DispatcherTimer -Property @{ Interval = [TimeSpan]::FromSeconds(2) }
$timer.Add_Tick({ Update-Stand })
$timer.Start()
$tuer = New-Object Windows.Threading.DispatcherTimer -Property @{ Interval = [TimeSpan]::FromMilliseconds(250) }
$tuer.Add_Tick({ if ($wecker.WaitOne(0)) { Show-Stand } })
$tuer.Start()
if (-not $Leise) { $win.Dispatcher.BeginInvoke([Action] { Show-Stand }) | Out-Null }
$app.Run()
