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
        Title="Claude Stand" Width="396" SizeToContent="Height" WindowStyle="None" AllowsTransparency="True"
        Background="Transparent" ResizeMode="NoResize" ShowInTaskbar="False" Topmost="True" Left="-3000" Top="0"
        FontFamily="Bahnschrift" FontSize="13" Foreground="{DynamicResource Schild}" UseLayoutRounding="True">
  <Window.Resources>
    <LinearGradientBrush x:Key="Scheibe" StartPoint="0,0" EndPoint="1,0">
      <GradientStop Color="#363b3e" Offset="0"/>
      <GradientStop Color="#9ba09d" Offset="0.3"/>
      <GradientStop Color="#d5dbd5" Offset="0.5"/>
      <GradientStop Color="#9ba09d" Offset="0.7"/>
      <GradientStop Color="#363b3e" Offset="1"/>
    </LinearGradientBrush>
    <LinearGradientBrush x:Key="Rand" StartPoint="0,0" EndPoint="1,0">
      <GradientStop Color="#FF090B0D" Offset="0"/>
      <GradientStop Color="#00090B0D" Offset="0.18"/>
      <GradientStop Color="#00090B0D" Offset="0.82"/>
      <GradientStop Color="#FF090B0D" Offset="1"/>
    </LinearGradientBrush>
    <LinearGradientBrush x:Key="Glas" StartPoint="0,0" EndPoint="0,1">
      <GradientStop Color="#25FFFFFF" Offset="0"/>
      <GradientStop Color="#04FFFFFF" Offset="0.4"/>
      <GradientStop Color="#00000000" Offset="0.5"/>
      <GradientStop Color="#30000000" Offset="1"/>
    </LinearGradientBrush>
    <Style x:Key="Leise" TargetType="Button">
      <Setter Property="Foreground" Value="{DynamicResource Schild}"/>
      <Setter Property="BorderBrush" Value="{DynamicResource Linie}"/>
      <Setter Property="Background" Value="{DynamicResource Deckel}"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="FocusVisualStyle" Value="{x:Null}"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="B" Background="{TemplateBinding Background}" BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="1" CornerRadius="6" Padding="12,5">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="B" Property="BorderBrush" Value="{DynamicResource Beschriftung}"/>
                <Setter TargetName="B" Property="Background" Value="{DynamicResource DeckelRaised}"/>
              </Trigger>
              <Trigger Property="IsKeyboardFocused" Value="True">
                <Setter TargetName="B" Property="BorderBrush" Value="{DynamicResource Schild}"/>
              </Trigger>
              <Trigger Property="IsPressed" Value="True">
                <Setter TargetName="B" Property="Background" Value="{DynamicResource Linie}"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>
  <Grid Margin="18">
    <Grid.RenderTransform><TranslateTransform x:Name="Schub"/></Grid.RenderTransform>
    <Border Background="{DynamicResource Gehaeuse}" CornerRadius="12">
      <Border.Effect><DropShadowEffect BlurRadius="30" ShadowDepth="7" Direction="270" Opacity="0.6" Color="Black"/></Border.Effect>
    </Border>
    <Border BorderBrush="{DynamicResource Linie}" BorderThickness="1" CornerRadius="12" Padding="12">
      <StackPanel>
        <!-- Header row -->
        <DockPanel Margin="4,2,4,10">
          <Border DockPanel.Dock="Right" BorderBrush="{DynamicResource LinieSubtle}" BorderThickness="1" Background="{DynamicResource Deckel}" CornerRadius="4" Padding="6,2">
            <TextBlock x:Name="Modell" FontSize="11" FontWeight="SemiBold" Foreground="{DynamicResource Schild}"/>
          </Border>
          <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
            <Ellipse Width="7" Height="7" Fill="{DynamicResource Gruen}" Margin="0,0,7,0"/>
            <TextBlock Text="CLAUDE STAND" FontSize="11" FontWeight="Bold" Foreground="{DynamicResource Schild}"/>
            <TextBlock Text=" // TELEMETRIE" FontSize="11" FontWeight="Normal" Foreground="{DynamicResource Beschriftung}"/>
          </StackPanel>
        </DockPanel>

        <!-- Main meter housing plate -->
        <Border Background="{DynamicResource Deckel}" BorderBrush="{DynamicResource LinieSubtle}" BorderThickness="1" CornerRadius="8" Padding="14,12,14,14">
          <StackPanel>
            <Grid>
              <Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition Width="16"/><ColumnDefinition/></Grid.ColumnDefinitions>
              <StackPanel x:Name="Fuenf" Grid.Column="0"/>
              <StackPanel x:Name="Woche" Grid.Column="2"/>
            </Grid>

            <!-- Ferraris meter disc aperture -->
            <Grid x:Name="Schlitz" Margin="0,16,0,0" Height="18" ClipToBounds="True">
              <Border Background="{DynamicResource Zaehlwerk}" CornerRadius="3" BorderBrush="{DynamicResource LinieSubtle}" BorderThickness="1"/>
              <Rectangle Height="6" Margin="4,0" Fill="{StaticResource Scheibe}"/>
              <Rectangle Height="6" Margin="4,0">
                <Rectangle.Fill>
                  <DrawingBrush TileMode="Tile" Viewport="0,0,12,6" ViewportUnits="Absolute" Stretch="None">
                    <DrawingBrush.Transform><TranslateTransform x:Name="Riffel"/></DrawingBrush.Transform>
                    <DrawingBrush.Drawing>
                      <DrawingGroup>
                        <GeometryDrawing Brush="Transparent"><GeometryDrawing.Geometry><RectangleGeometry Rect="0,0,12,6"/></GeometryDrawing.Geometry></GeometryDrawing>
                        <GeometryDrawing Brush="#80090B0D"><GeometryDrawing.Geometry><RectangleGeometry Rect="0,0,1,6"/></GeometryDrawing.Geometry></GeometryDrawing>
                      </DrawingGroup>
                    </DrawingBrush.Drawing>
                  </DrawingBrush>
                </Rectangle.Fill>
              </Rectangle>
              <Canvas Margin="4,0">
                <Rectangle Width="9" Height="6" Canvas.Top="6" Fill="{DynamicResource Rot}">
                  <Rectangle.RenderTransform><TranslateTransform x:Name="Marke" X="-16"/></Rectangle.RenderTransform>
                </Rectangle>
              </Canvas>
              <Rectangle Height="6" Margin="4,0" Fill="{StaticResource Rand}"/>
              <Rectangle Margin="1,1" Fill="{StaticResource Glas}" IsHitTestVisible="False"/>
            </Grid>
            <TextBlock x:Name="Tempo" Margin="0,8,0,0" FontSize="11.5" Foreground="{DynamicResource Beschriftung}"/>
          </StackPanel>
        </Border>

        <!-- Telemetry Stats Grid (Heute / Diese Woche) -->
        <Border Margin="0,10,0,0" Background="{DynamicResource Deckel}" BorderBrush="{DynamicResource LinieSubtle}" BorderThickness="1" CornerRadius="8" Padding="12,10">
          <Grid>
            <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/><ColumnDefinition Width="Auto" MinWidth="110"/></Grid.ColumnDefinitions>
            <Grid.RowDefinitions><RowDefinition/><RowDefinition Height="6"/><RowDefinition/></Grid.RowDefinitions>
            <TextBlock Text="Heute" FontSize="13" FontWeight="SemiBold" VerticalAlignment="Center"/>
            <TextBlock x:Name="HeuteGeld" Grid.Column="1" FontSize="13" FontWeight="Bold" TextAlignment="Right" VerticalAlignment="Center"/>
            <TextBlock x:Name="HeuteTokens" Grid.Column="2" FontSize="12.5" TextAlignment="Right" Foreground="{DynamicResource Beschriftung}" VerticalAlignment="Center"/>
            <TextBlock Grid.Row="2" Text="Diese Woche" FontSize="13" FontWeight="SemiBold" VerticalAlignment="Center"/>
            <TextBlock x:Name="WocheGeld" Grid.Row="2" Grid.Column="1" FontSize="13" FontWeight="Bold" TextAlignment="Right" VerticalAlignment="Center"/>
            <TextBlock x:Name="WocheTokens" Grid.Row="2" Grid.Column="2" FontSize="12.5" TextAlignment="Right" Foreground="{DynamicResource Beschriftung}" VerticalAlignment="Center"/>
          </Grid>
        </Border>

        <!-- Bottom bar -->
        <DockPanel Margin="4,12,4,2">
          <Button x:Name="Oeffnen" DockPanel.Dock="Right" Style="{StaticResource Leise}" FontSize="12" Content="Stand öffnen"/>
          <TextBlock x:Name="Zuletzt" Margin="0,0,10,0" VerticalAlignment="Center" FontSize="11.5" TextTrimming="CharacterEllipsis" Foreground="{DynamicResource Beschriftung}"/>
        </DockPanel>
      </StackPanel>
    </Border>
  </Grid>
</Window>
'@)
$ui = @{}
foreach ($n in 'Schub', 'Modell', 'Fuenf', 'Woche', 'Schlitz', 'Riffel', 'Marke', 'Tempo', 'HeuteGeld', 'HeuteTokens', 'WocheGeld', 'WocheTokens', 'Oeffnen', 'Zuletzt') { $ui[$n] = $win.FindName($n) }

function Set-Theme {
  $hell = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -ErrorAction SilentlyContinue).SystemUsesLightTheme -eq 1
  $script:farbe = $farben[$(if ($hell) { 'hell' } else { 'dunkel' })]
  foreach ($k in $farbe.Keys) { $win.Resources[$k] = $pinsel.ConvertFromString($farbe[$k]) }
}
Set-Theme

# Counter wheels like the Stand page: 0.72em wide, 1.1em high, the ones wheel red, leading zeros dimmed.
$H = 42
function New-Zaehler($panel, $label, $window) {
  $panel.Children.Add((New-Object Windows.Controls.TextBlock -Property @{ Text = $label.ToUpper(); FontSize = 11; FontWeight = 'Bold'; Foreground = (New-Object Windows.Media.SolidColorBrush -ArgumentList ([Windows.Media.Color]::FromArgb(180, 140, 150, 156))) })) | Out-Null
  
  $drumFrame = New-Object Windows.Controls.Border -Property @{ CornerRadius = 6; Background = $pinsel.ConvertFromString($script:farbe.Zaehlwerk); BorderBrush = $pinsel.ConvertFromString($script:farbe.LinieSubtle); BorderThickness = (New-Object Windows.Thickness(1)); Padding = (New-Object Windows.Thickness(5, 4, 5, 4)); Margin = (New-Object Windows.Thickness(0, 6, 0, 0)) }
  
  $row = New-Object Windows.Controls.StackPanel -Property @{ Orientation = 'Horizontal' }
  $walzen = foreach ($i in 0..2) {
    $b = New-Object Windows.Controls.Border -Property @{ Width = 28; Height = $H; CornerRadius = 3; ClipToBounds = $true; Margin = '0,0,2,0' }
    $b.SetResourceReference([Windows.Controls.Border]::BackgroundProperty, $(if ($i -eq 2) { 'RotDrum' } else { 'Zaehlwerk' }))
    $sp = New-Object Windows.Controls.StackPanel -Property @{ Width = 28 }
    $sp.RenderTransform = New-Object Windows.Media.TranslateTransform
    foreach ($z in 0..9) {
      $t = New-Object Windows.Controls.TextBlock -Property @{ Text = "$z"; Height = $H; FontSize = 36; FontWeight = 'Bold'; FontStretch = 'Condensed'; TextAlignment = 'Center'; Padding = '0,2,0,0' }
      $t.SetResourceReference([Windows.Controls.TextBlock]::ForegroundProperty, 'Ziffer')
      $sp.Children.Add($t) | Out-Null
    }
    # Cylinder curvature overlay
    $curv = New-Object Windows.Shapes.Rectangle -Property @{ Width = 28; Height = $H; IsHitTestVisible = $false }
    $curvBrush = New-Object Windows.Media.LinearGradientBrush
    $curvBrush.StartPoint = New-Object Windows.Point(0, 0)
    $curvBrush.EndPoint = New-Object Windows.Point(0, 1)
    $curvBrush.GradientStops.Add((New-Object Windows.Media.GradientStop([Windows.Media.Color]::FromArgb(110, 0, 0, 0), 0.0)))
    $curvBrush.GradientStops.Add((New-Object Windows.Media.GradientStop([Windows.Media.Color]::FromArgb(25, 255, 255, 255), 0.45)))
    $curvBrush.GradientStops.Add((New-Object Windows.Media.GradientStop([Windows.Media.Color]::FromArgb(0, 255, 255, 255), 0.55)))
    $curvBrush.GradientStops.Add((New-Object Windows.Media.GradientStop([Windows.Media.Color]::FromArgb(130, 0, 0, 0), 1.0)))
    $curv.Fill = $curvBrush

    $grid = New-Object Windows.Controls.Grid
    $roll = New-Object Windows.Controls.Canvas
    $roll.Children.Add($sp) | Out-Null
    $grid.Children.Add($roll) | Out-Null
    $grid.Children.Add($curv) | Out-Null
    $b.Child = $grid
    $row.Children.Add($b) | Out-Null
    @{ panel = $sp; d = 0 }
  }
  $pct = New-Object Windows.Controls.TextBlock -Property @{ Text = '%'; FontSize = 16; FontWeight = 'Bold'; VerticalAlignment = 'Bottom'; Margin = '2,0,0,4' }
  $pct.SetResourceReference([Windows.Controls.TextBlock]::ForegroundProperty, 'Beschriftung')
  $row.Children.Add($pct) | Out-Null
  $drumFrame.Child = $row
  $panel.Children.Add($drumFrame) | Out-Null

  # Bar: filled up to the use, the thin tick marks where an even pace would be by now.
  $bar = New-Object Windows.Controls.Grid -Property @{ Height = 9; Margin = '0,10,0,0' }
  $track = New-Object Windows.Controls.Border -Property @{ Height = 3.5; CornerRadius = 1.75 }
  $track.SetResourceReference([Windows.Controls.Border]::BackgroundProperty, 'Linie')
  $fillGrid = New-Object Windows.Controls.Grid
  $tickGrid = New-Object Windows.Controls.Grid
  foreach ($g in $fillGrid, $tickGrid) { 1..2 | ForEach-Object { $g.ColumnDefinitions.Add((New-Object Windows.Controls.ColumnDefinition)) } }
  $fill = New-Object Windows.Controls.Border -Property @{ Height = 3.5; CornerRadius = 1.75 }
  $fillGrid.Children.Add($fill) | Out-Null
  $tick = New-Object Windows.Shapes.Rectangle -Property @{ Width = 1.5; Height = 9; HorizontalAlignment = 'Left' }
  $tick.SetResourceReference([Windows.Shapes.Shape]::FillProperty, 'Beschriftung')
  [Windows.Controls.Grid]::SetColumn($tick, 1)
  $tickGrid.Children.Add($tick) | Out-Null
  foreach ($e in $track, $fillGrid, $tickGrid) { $bar.Children.Add($e) | Out-Null }
  $panel.Children.Add($bar) | Out-Null

  $reset = New-Object Windows.Controls.TextBlock -Property @{ FontSize = 11.5; Margin = '0,6,0,0' }
  $reset.SetResourceReference([Windows.Controls.TextBlock]::ForegroundProperty, 'Beschriftung')
  $panel.Children.Add($reset) | Out-Null
  @{ walzen = @($walzen); fill = $fill; fillGrid = $fillGrid; tick = $tick; tickGrid = $tickGrid; reset = $reset; window = $window }
}
$zaehler = @{ five = New-Zaehler $ui.Fuenf '5 Stunden' 18000; week = New-Zaehler $ui.Woche 'Woche' 604800 }

function Set-Zaehler($z, $limit, [long]$now) {
  $n = if ($null -eq $limit.pct) { 0 } else { [math]::Min(100, [math]::Max(0, $limit.pct)) }
  $txt = $n.ToString('000')
  for ($i = 0; $i -lt 3; $i++) {
    $w = $z.walzen[$i]
    $d = [int]"$($txt[$i])"
    $w.panel.Opacity = if ($null -eq $limit.pct -or ($i -lt 2 -and $n -lt [math]::Pow(10, 2 - $i))) { 0.45 } else { 1 }
    if ($w.d -eq $d) { continue }
    $w.d = $d
    $roll = New-Object Windows.Media.Animation.DoubleAnimation((-$d * $H), [TimeSpan]::FromMilliseconds($(if ($motion) { 900 } else { 0 })))
    $roll.EasingFunction = New-Object Windows.Media.Animation.QuarticEase -Property @{ EasingMode = 'EaseOut' }
    $w.panel.RenderTransform.BeginAnimation([Windows.Media.TranslateTransform]::YProperty, $roll)
  }
  $z.fillGrid.ColumnDefinitions[0].Width = New-Object Windows.GridLength($n, 'Star')
  $z.fillGrid.ColumnDefinitions[1].Width = New-Object Windows.GridLength((100 - $n), 'Star')
  $z.fill.SetResourceReference([Windows.Controls.Border]::BackgroundProperty, $(if ($n -ge 90) { 'Rot' } else { 'Schild' }))
  $z.tick.Visibility = if ($limit.reset) { 'Visible' } else { 'Hidden' }
  if ($limit.reset) {
    $f = [math]::Min(1.0, [math]::Max(0.0, 1 - ($limit.reset - $now) / $z.window))
    $z.tickGrid.ColumnDefinitions[0].Width = New-Object Windows.GridLength($f, 'Star')
    $z.tickGrid.ColumnDefinitions[1].Width = New-Object Windows.GridLength((1 - $f), 'Star')
  }
  $z.reset.Text = Format-Reset $limit $now
}

# The meter disc: its red mark passes the slot once per turn, and it turns faster the more $ per hour go through
# (with the square root, so 4 $ turn it twice as fast as 1 $; at most 10 times, before the ticks start to flicker).
$st = @{ cache = @{}; samples = New-Object Collections.ArrayList; r = $null; icon = $null; iconText = $null; toggled = [DateTime]::MinValue; left = [DateTime]::MinValue; disc = $null }
function Start-Scheibe {
  $w = $ui.Schlitz.ActualWidth - 8
  $T = 24.0  # seconds per turn at 1 $ per hour
  $mark = New-Object Windows.Media.Animation.DoubleAnimationUsingKeyFrames -Property @{ Duration = [TimeSpan]::FromSeconds($T); RepeatBehavior = [Windows.Media.Animation.RepeatBehavior]::Forever }
  $mark.KeyFrames.Add((New-Object Windows.Media.Animation.DiscreteDoubleKeyFrame(-16, [TimeSpan]::Zero))) | Out-Null
  $mark.KeyFrames.Add((New-Object Windows.Media.Animation.EasingDoubleKeyFrame(($w + 6), [TimeSpan]::FromSeconds($T / 2), (New-Object Windows.Media.Animation.SineEase -Property @{ EasingMode = 'EaseInOut' })))) | Out-Null
  $rim = New-Object Windows.Media.Animation.DoubleAnimation(0, 12, [TimeSpan]::FromSeconds(12 * $T / ([math]::PI * $w)))
  $rim.RepeatBehavior = [Windows.Media.Animation.RepeatBehavior]::Forever
  $clocks = @($mark.CreateClock(), $rim.CreateClock())
  $ui.Marke.ApplyAnimationClock([Windows.Media.TranslateTransform]::XProperty, $clocks[0])
  $ui.Riffel.ApplyAnimationClock([Windows.Media.TranslateTransform]::XProperty, $clocks[1])
  foreach ($c in $clocks) { $c.Controller.Pause() }
  $st.disc = $clocks
}
function Set-Scheibe($speed) {
  if (-not $ui.Schlitz.ActualWidth) { return }  # not laid out yet
  if (-not $motion) { $ui.Marke.X = ($ui.Schlitz.ActualWidth - 8) * 0.4; return }
  if (-not $st.disc) { Start-Scheibe }
  foreach ($c in $st.disc) {
    if ($speed -gt 0) { $c.Controller.SpeedRatio = $speed; $c.Controller.Resume() } else { $c.Controller.Pause() }
  }
}

function Update-View {
  $r = $st.r
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  Set-Zaehler $zaehler.five $r.five $now
  Set-Zaehler $zaehler.week $r.week $now
  $ui.Modell.Text = "$($r.last.model)"
  $ui.HeuteGeld.Text = Format-Geld $r.todayCost
  $ui.WocheGeld.Text = Format-Geld $r.weekCost
  $ui.HeuteTokens.Text = "$(Format-Tokens $r.todayTokens) Tokens"
  $ui.WocheTokens.Text = "$(Format-Tokens $r.weekTokens) Tokens"
  $ui.Zuletzt.Text = if ($r.last) { "Zuletzt $($r.last.project), $(Format-Vor ($now - $r.last.updated))" } else { 'Startet mit der nächsten Antwort in Claude Code' }

  $active = $r.last -and ($now - $r.last.updated) -lt 120
  $rate = Get-Rate $st.samples
  if (-not $active -or $rate -eq 0) { Set-Scheibe 0; $ui.Tempo.Text = 'Gerade kein Verbrauch' }
  elseif ($null -eq $rate) { Set-Scheibe 1; $ui.Tempo.Text = 'Läuft gerade' }
  else { Set-Scheibe ([math]::Min(10.0, [math]::Max(0.3, [math]::Sqrt($rate)))); $ui.Tempo.Text = "Gerade $(Format-Geld $rate) pro Stunde" }
}

function Set-TrayIcon($text, $alarm) {
  try {
    $px = [Windows.Forms.SystemInformation]::SmallIconSize.Width
    if ($px -lt 16) { $px = 16 }
    $bmp = New-Object System.Drawing.Bitmap($px, $px)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $bgHex = if ($alarm) { $script:farbe.Rot } else { $script:farbe.Zaehlwerk }
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
    $txtHex = $script:farbe.Ziffer
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
  Set-Theme
  Update-View
  $win.BeginAnimation([Windows.Window]::OpacityProperty, $null)
  $win.Opacity = 0
  $win.Show()
  $win.UpdateLayout()
  $wa = [Windows.SystemParameters]::WorkArea
  $win.Left = $wa.Right - $win.ActualWidth + 4
  $win.Top = $wa.Bottom - $win.ActualHeight + 4
  $null = $win.Activate()
  if ($motion) {
    $win.BeginAnimation([Windows.Window]::OpacityProperty, (New-Object Windows.Media.Animation.DoubleAnimation(0, 1, [TimeSpan]::FromMilliseconds(140))))
    $slide = New-Object Windows.Media.Animation.DoubleAnimation(14, 0, [TimeSpan]::FromMilliseconds(240))
    $slide.EasingFunction = New-Object Windows.Media.Animation.CubicEase -Property @{ EasingMode = 'EaseOut' }
    $ui.Schub.BeginAnimation([Windows.Media.TranslateTransform]::YProperty, $slide)
  } else { $win.Opacity = 1 }
  Update-View  # the disc needs the laid-out slot width
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
