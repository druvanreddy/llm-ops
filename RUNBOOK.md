# Runbook — LLM Ops Triage Service

## Quick Reference

| Alert | Severity | First Check | Mitigation |
|-------|----------|-------------|------------|
| SLOBurnRateHigh | Critical | Provider status pages → circuit breaker state → recent deploys | Rollback last prompt/model change; verify fallback is working |
| CostSpikeDetected | Warning | Token usage dashboard → recent prompt changes → traffic spike | Check for retry storms; verify input token caps; rollback prompt if longer |
| FallbackRateHigh | Warning | Primary provider status → circuit breaker state → error logs | Check if primary is degraded; if outage, wait for recovery; verify fallback health |
| SchemaValidRateLow | Warning | Recent prompt changes → model version changes → response samples | Rollback prompt; check if model was updated by provider; verify response_format |

---

## Alert: SLOBurnRateHigh

**What it means:** Error rate is consuming the 7-day error budget faster than sustainable. At the alert threshold (14.4x burn rate), the budget will be exhausted in ~12 hours.

**Check first:**
1. Open Grafana → LLM Ops dashboard → Error Rate by Class panel
2. Identify the dominant error class (rate_limit, timeout, provider_5xx, schema_fail)
3. Check provider status pages: [OpenAI](https://status.openai.com), [Anthropic](https://status.anthropic.com)
4. Check circuit breaker state: `curl localhost:8000/readyz`
5. Check recent deploys: `git log --oneline -5`

**Mitigate:**
- If provider_5xx: verify fallback is routing → check Fallback Rate panel
- If rate_limit: check per-client usage → tighten rate limits if one client is flooding
- If schema_fail: rollback to previous prompt version → `ACTIVE_PROMPT_VERSION=v{N-1}`
- If timeout: check if provider latency has increased → consider lowering timeout to fail faster to fallback

---

## Alert: CostSpikeDetected

**What it means:** Current spend per minute is >3x the trailing hourly average.

**Check first:**
1. Grafana → Tokens/Minute panel → check if input tokens spiked
2. Check if a prompt change increased system prompt length
3. Check if retry storms are multiplying requests
4. Check if traffic spiked (RPS panel)

**Mitigate:**
- If prompt change: rollback to shorter version
- If retry storm: check error logs for what's being retried; non-retryable errors should not be retried
- If traffic spike: verify rate limits are working; check if a specific client_id is responsible

---

## Alert: FallbackRateHigh

**What it means:** >10% of requests are being served by the fallback provider instead of the primary.

**Check first:**
1. Is the primary provider experiencing issues? Check status page
2. Is the circuit breaker open? `curl localhost:8000/readyz`
3. Are there elevated error rates on the primary? Check Error Rate by Class panel

**Mitigate:**
- If provider outage: the fallback IS the mitigation; monitor until primary recovers
- If circuit breaker stuck open: check if recovery_timeout has passed; if primary is healthy, manually reset
- If intermittent: may indicate degraded primary; monitor closely

---

## Alert: SchemaValidRateLow

**What it means:** <95% of LLM responses are parsing into the expected Pydantic schema on the first try.

**Check first:**
1. Was there a recent prompt change? `git log --oneline prompts/`
2. Did the model provider update the model? Check provider changelogs
3. Open Langfuse → filter by schema_fail → inspect actual responses

**Mitigate:**
- Rollback to the last known-good prompt version
- If model was updated: test the current prompt against the new model version
- If responses are close but have wrong field names/types: adjust the prompt's output instructions

---

## Common Operations

### Rollback a prompt
```bash
# Change the active version (no rebuild needed)
export ACTIVE_PROMPT_VERSION=v1
# Or in .env: ACTIVE_PROMPT_VERSION=v1
# Restart the service to pick up the change
docker compose restart app
```

### Check circuit breaker state
```bash
curl -s localhost:8000/readyz | python -m json.tool
```

### View recent traces
Open Langfuse at http://localhost:3000 → Traces → filter by time range

### Check error budget
Grafana → LLM Ops dashboard → Error Budget Remaining panel

### Force fallback (for testing)
Set an invalid primary API key to trigger circuit breaker:
```bash
OPENAI_API_KEY=sk-invalid docker compose restart app
```
