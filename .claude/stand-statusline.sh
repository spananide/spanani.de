#!/bin/sh
in=$(cat)
url=${CLAUDE_STAND_URL:-https://claude-stand.spanani.workers.dev/push}
key=${CLAUDE_STAND_KEY:-$(cat "$HOME/.claude/stand-key" 2>/dev/null)}
dir=${TMPDIR:-/tmp}
now=$(date +%s)
last=$(cat "$dir/claude-stand-sent" 2>/dev/null || echo 0)

printf '%s' "$in" | jq -c '{at: now, rate_limits}' > "$dir/claude-stand-last.json" 2>/dev/null

if [ -n "$key" ] && [ $((now - last)) -ge 10 ]; then
  echo "$now" > "$dir/claude-stand-sent"
  (
    printf '%s' "$in" | jq -c '{
      session: .session_id,
      project: (if .workspace.repo.name then "\(.workspace.repo.owner)/\(.workspace.repo.name)" else ((.workspace.project_dir // .cwd // "") | split("/") | last) end),
      model: .model.display_name,
      model_id: .model.id,
      version: .version,
      effort: .effort.level,
      cost: .cost.total_cost_usd,
      duration_ms: .cost.total_duration_ms,
      api_ms: .cost.total_api_duration_ms,
      added: .cost.total_lines_added,
      removed: .cost.total_lines_removed,
      ctx_pct: .context_window.used_percentage,
      ctx_size: .context_window.context_window_size,
      tokens_in: .context_window.total_input_tokens,
      tokens_out: .context_window.total_output_tokens,
      cache_hit: .prompt_cache.hit_ratio,
      cache_warm: .prompt_cache.warm,
      cache_expires: .prompt_cache.expires_at,
      fast: .fast_mode,
      thinking: .thinking.enabled,
      rate_limits: .rate_limits
    }' | curl -s -m 5 -o "$dir/claude-stand-response" -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' -H "Authorization: Bearer $key" --data-binary @- "$url"
  ) > "$dir/claude-stand-status" 2>&1 &
fi

printf '%s' "$in" | jq -r '[
  .model.display_name,
  (.rate_limits.five_hour.used_percentage // empty | "5h \(round) %"),
  (.rate_limits.seven_day.used_percentage // empty | "Woche \(round) %"),
  (.context_window.used_percentage // empty | "Kontext \(round) %")
] | join("   ")'
