$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$d = [Console]::In.ReadToEnd() | ConvertFrom-Json
$url = if ($env:CLAUDE_STAND_URL) { $env:CLAUDE_STAND_URL } else { 'https://claude-stand.spanani.workers.dev/push' }
$dir = [IO.Path]::GetTempPath()
$stamp = Join-Path $dir 'claude-stand-sent'
$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$last = 0
if (Test-Path $stamp) { [long]::TryParse((Get-Content $stamp -Raw).Trim(), [ref]$last) | Out-Null }

if ($now - $last -ge 10) {
  Set-Content $stamp $now
  $repo = $d.workspace.repo
  $folder = if ($d.workspace.project_dir) { $d.workspace.project_dir } else { $d.cwd }
  $project = if ($repo.name) { "$($repo.owner)/$($repo.name)" } elseif ($folder) { Split-Path -Leaf $folder } else { $null }
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

$parts = @($d.model.display_name)
if ($null -ne $d.rate_limits.five_hour.used_percentage) { $parts += "5h $([math]::Round($d.rate_limits.five_hour.used_percentage)) %" }
if ($null -ne $d.rate_limits.seven_day.used_percentage) { $parts += "Woche $([math]::Round($d.rate_limits.seven_day.used_percentage)) %" }
if ($null -ne $d.context_window.used_percentage) { $parts += "Kontext $([math]::Round($d.context_window.used_percentage)) %" }
Write-Output ($parts -join '   ')
