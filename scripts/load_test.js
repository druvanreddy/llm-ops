// k6 load test for the triage API
// Usage: k6 run scripts/load_test.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const triageLatency = new Trend("triage_latency", true);

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

const SAMPLE_TICKETS = [
  "My payment was charged twice and my order still shows as pending. I need this resolved urgently.",
  "How do I reset my password? I forgot it and can't log into my account.",
  "The export feature is broken. When I click Export to CSV, nothing happens. Chrome console shows a 500 error.",
  "I'd like to cancel my subscription. I no longer need the service.",
  "Can you tell me more about the enterprise pricing tier? We have about 50 users.",
  "I received the wrong item in my order. I ordered a blue shirt but got a red one.",
  "Your API is returning 503 errors intermittently since this morning. This is affecting our production system.",
  "I was charged $99 but my plan should be $49. Please refund the difference.",
  "The mobile app crashes every time I try to open the settings page. iPhone 15, iOS 18.",
  "I need to update my billing address. How do I do that?",
];

export const options = {
  stages: [
    { duration: "30s", target: 1 },   // Warm up
    { duration: "1m",  target: 2 },   // Low load
    { duration: "1m",  target: 5 },   // Medium load
    { duration: "1m",  target: 10 },  // Target load
    { duration: "1m",  target: 20 },  // Stress test
    { duration: "30s", target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ["p(95)<4000"],  // p95 under 4s SLO
    errors: ["rate<0.01"],              // <1% error rate
  },
};

export default function () {
  const ticket = SAMPLE_TICKETS[Math.floor(Math.random() * SAMPLE_TICKETS.length)];

  const payload = JSON.stringify({
    ticket_text: ticket,
    client_id: `k6-vu-${__VU}`,
  });

  const params = {
    headers: { "Content-Type": "application/json" },
    timeout: "30s",
  };

  const res = http.post(`${BASE_URL}/api/v1/triage`, payload, params);

  const success = check(res, {
    "status is 200": (r) => r.status === 200,
    "has result": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result && body.result.category;
      } catch {
        return false;
      }
    },
    "has metadata": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.metadata && body.metadata.prompt_version;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  triageLatency.add(res.timings.duration);

  sleep(0.5);
}
