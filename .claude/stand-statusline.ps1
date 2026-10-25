$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$d = [Console]::In.ReadToEnd() | ConvertFrom-Json
$url = if ($env:CLAUDE_STAND_URL) { $env:CLAUDE_STAND_URL } else { 'https://claude-stand.spanani.workers.dev/push' }
$dir = [IO.Path]::GetTempPath()
$stamp = Join-Path $dir 'claude-stand-sent'
$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$last = 0
if (Test-Path $stamp) { [long]::TryParse((Get-Content $stamp -Raw).Trim(), [ref]$last) | Out-Null }
$repo = $d.workspace.repo
$folder = if ($d.workspace.project_dir) { $d.workspace.project_dir } else { $d.cwd }
$project = if ($repo.name) { "$($repo.owner)/$($repo.name)" } elseif ($folder) { Split-Path -Leaf $folder } else { $null }

if ($now - $last -ge 10) {
  Set-Content $stamp $now
  $body = [ordered]@{
    session       = $d.session_id
    project       = $project
    model         = $d.model.display_name
    model_id      = $d.model.id
    version       = $d.version
    effort        = $d.effort.level
    cost          = $d.cost.total_cost_usd
    duration_ms   = $d.cost.total_duration_ms
    api_ms        = $d.cost.total_api_duration_ms
    added         = $d.cost.total_lines_added
    removed       = $d.cost.total_lines_removed
    ctx_pct       = $d.context_window.used_percentage
    ctx_size      = $d.context_window.context_window_size
    tokens_in     = $d.context_window.total_input_tokens
    tokens_out    = $d.context_window.total_output_tokens
    cache_hit     = $d.prompt_cache.hit_ratio
    cache_warm    = $d.prompt_cache.warm
    cache_expires = $d.prompt_cache.expires_at
    fast          = $d.fast_mode
    thinking      = $d.thinking.enabled
    rate_limits   = $d.rate_limits
  } | ConvertTo-Json -Depth 6 -Compress
  try {
    $r = Invoke-WebRequest -Uri $url -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($body)) -ContentType 'application/json' -TimeoutSec 4 -UseBasicParsing
    Set-Content (Join-Path $dir 'claude-stand-status') $r.StatusCode
  } catch {
    Set-Content (Join-Path $dir 'claude-stand-status') $_.Exception.Message
  }
}

# Totals of this conversation for the terminal and the tray app (stand-tray.ps1), one file per session.
# Claude Code only hands over the current context, so the usage lines of the transcript are added up,
# reading only the bytes that are new since the last run. Tokens and cost are also kept per local hour.
$in = 0; $out = 0
$cost = [double]$d.cost.total_cost_usd
if ($d.session_id) {
  $store = if ($env:CLAUDE_STAND_DIR) { $env:CLAUDE_STAND_DIR } else { Join-Path $HOME '.claude\stand' }
  New-Item -ItemType Directory -Force $store | Out-Null
  $file = Join-Path $store "$($d.session_id).json"
  $lock = New-Object Threading.Mutex($false, "claude-stand-$($d.session_id)")
  try { $null = $lock.WaitOne(3000) } catch {}
  try {
    $s = if (Test-Path -LiteralPath $file) { Get-Content -LiteralPath $file -Raw | ConvertFrom-Json }
    $hours = @{}
    foreach ($p in $s.hours.PSObject.Properties) { $hours[$p.Name] = @($p.Value) }
    $add = { param($key, $a, $b, $c) if (-not $hours[$key]) { $hours[$key] = @(0, 0, 0.0) }; $h = $hours[$key]; $h[0] += $a; $h[1] += $b; $h[2] += $c }
    $offset = [long]$s.offset; $lastId = $s.lastId; $in = [long]$s.in; $out = [long]$s.out
    $lastUse = if ($s.lastUse) { @($s.lastUse) } else { @(0, 0) }
    $added = @{}

    $t = $d.transcript_path
    if ($t -and (Test-Path -LiteralPath $t)) {
      $fs = [IO.File]::Open($t, 'Open', 'Read', 'ReadWrite')
      try {
        $offset = [math]::Min($offset, $fs.Length)
        $fs.Position = $offset
        $buf = New-Object byte[] ($fs.Length - $offset)
        $n = 0
        while ($n -lt $buf.Length) { $r = $fs.Read($buf, $n, $buf.Length - $n); if ($r -le 0) { break }; $n += $r }
      } finally { $fs.Dispose() }
      $end = [Array]::LastIndexOf($buf, [byte]10)  # whole lines only; one still being written waits for the next run
      if ($end -ge 0) {
        $offset += $end + 1
        foreach ($line in [Text.Encoding]::UTF8.GetString($buf, 0, $end).Split("`n")) {
          $u = $line.IndexOf('"usage":{')
          if ($u -lt 0 -or $line.IndexOf('"role":"assistant"') -lt 0) { continue }
          $rest = $line.Substring($u)
          $v = foreach ($k in 'input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens') { [long][regex]::Match($rest, "`"$k`":(\d+)").Groups[1].Value }
          $use = @(($v[0] + $v[1] + $v[2]), $v[3])
          $id = [regex]::Match($line, '"id":"(msg_[^"]+)"').Groups[1].Value
          # One answer is written as several lines with the same message id and usage: count it once.
          if ($id -and $id -eq $lastId) { $dIn = $use[0] - $lastUse[0]; $dOut = $use[1] - $lastUse[1] } else { $dIn = $use[0]; $dOut = $use[1] }
          $ts = [regex]::Matches($line, '"timestamp":"([^"]+)"')
          $when = if ($ts.Count) { [DateTimeOffset]::Parse($ts[$ts.Count - 1].Groups[1].Value).LocalDateTime } else { Get-Date }
          $key = $when.ToString('yyyy-MM-ddTHH')
          & $add $key $dIn $dOut 0
          $added[$key] += $dIn + $dOut
          $in += $dIn; $out += $dOut; $lastId = $id; $lastUse = $use
        }
      }
    }

    $paid = [double]$s.cost
    $dCost = if ($cost -ge $paid) { $cost - $paid } else { $cost }  # a lower total means the counter restarted
    # The new cost goes to the hours of the tokens read in this run; only a session's first run reaches back.
    # ponytail: shared by token count, not by price; only that first backfill is approximate
    $sum = 0; foreach ($v in $added.Values) { $sum += $v }
    if ($dCost -gt 0 -and $sum -gt 0) { foreach ($k in @($added.Keys)) { & $add $k 0 0 ($dCost * $added[$k] / $sum) } }
    elseif ($dCost -gt 0) { & $add (Get-Date).ToString('yyyy-MM-ddTHH') 0 0 $dCost }
    $cut = (Get-Date).AddDays(-35).ToString('yyyy-MM-ddTHH')
    foreach ($k in @($hours.Keys)) { if ($k -lt $cut) { $hours.Remove($k) } }

    $rl = $d.rate_limits
    $json = [ordered]@{
      project   = $project
      model     = $d.model.display_name
      updated   = $now
      cost      = $cost
      in        = $in
      out       = $out
      five      = if ($rl.five_hour) { $rl.five_hour.used_percentage } else { $s.five }
      fiveReset = if ($rl.five_hour) { $rl.five_hour.resets_at } else { $s.fiveReset }
      week      = if ($rl.seven_day) { $rl.seven_day.used_percentage } else { $s.week }
      weekReset = if ($rl.seven_day) { $rl.seven_day.resets_at } else { $s.weekReset }
      offset    = $offset
      lastId    = $lastId
      lastUse   = $lastUse
      hours     = $hours
    } | ConvertTo-Json -Depth 4 -Compress
    [IO.File]::WriteAllText($file, $json)
  } finally { $lock.ReleaseMutex() }
}

$E = [char]27
$dot = " $E[2m$([char]0xB7)$E[0m "
$de = [Globalization.CultureInfo]::GetCultureInfo('de-DE')
function farbe($used) { if ($used -ge 90) { 31 } elseif ($used -ge 70) { 33 } else { 32 } }
function kurz($n) { if ($n -ge 1e6) { ($n / 1e6).ToString('0.0', $de) + 'M' } elseif ($n -ge 1e3) { "$([math]::Round($n / 1e3))k" } else { "$n" } }
function bis($at) {
  $t = [TimeSpan]::FromSeconds([math]::Max(0, [long]$at - $now))
  if ($t.Days) { "$($t.Days)d$($t.Hours)h" } elseif ($t.Hours) { "$($t.Hours)h$($t.Minutes.ToString('00'))m" } else { "$($t.Minutes)m" }
}

$l1 = @("$E[1m$($d.model.display_name)$E[0m")
$ctx = $d.context_window.used_percentage
if ($null -ne $ctx) {
  $full = [math]::Min(6, [math]::Round($ctx / 100 * 6))
  $l1 += "Kontext $([math]::Round($ctx))% $E[$(farbe $ctx)m$([string][char]0x2588 * $full)$E[2m$([string][char]0x2591 * (6 - $full))$E[0m"
}
if ($in -or $out) { $l1 += "$(kurz $in)$([char]0x2191) $(kurz $out)$([char]0x2193)" }
if ($cost) { $l1 += "$($cost.ToString('0.00', $de)) `$" }
if ($d.cost.total_duration_ms) {
  $t = [TimeSpan]::FromMilliseconds($d.cost.total_duration_ms)
  $l1 += if ($t.TotalHours -ge 1) { "$([math]::Floor($t.TotalHours))h$($t.Minutes.ToString('00'))m" } else { "$($t.Minutes)m$($t.Seconds.ToString('00'))s" }
}
if ($d.cost.total_lines_added -or $d.cost.total_lines_removed) { $l1 += "$E[32m+$($d.cost.total_lines_added)$E[0m $E[31m$([char]0x2212)$($d.cost.total_lines_removed)$E[0m" }
if ($null -ne $d.prompt_cache.hit_ratio) { $l1 += "Cache $([math]::Round($d.prompt_cache.hit_ratio * 100))%" }

$l2 = @()
foreach ($x in @(@('5h', $d.rate_limits.five_hour), @('Woche', $d.rate_limits.seven_day))) {
  if ($null -eq $x[1].used_percentage) { continue }
  $p = [math]::Round($x[1].used_percentage)
  $l2 += "$E[2m$($x[0])$E[0m $E[1;$(farbe $p)m$p%$E[0m $E[2m$([char]0x21BB)$(bis $x[1].resets_at)$E[0m"
}
Write-Output ($l1 -join $dot)
if ($l2) { Write-Output ($l2 -join $dot) }
