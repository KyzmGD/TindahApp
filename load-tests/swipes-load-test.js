import http from "k6/http";
import { check, fail } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import exec from "k6/execution";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || "1m";
const RUN_ID = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

if (!Number.isInteger(VUS) || VUS < 2 || VUS % 2 !== 0) {
  throw new Error("VUS must be an even integer of at least 2.");
}

const swipeRequests = new Counter("swipe_requests");
const swipeResponseTime = new Trend("swipe_response_time", true);
const swipeHttpErrorRate = new Rate("swipe_http_error_rate");
const swipeHttp500Rate = new Rate("swipe_http_500_rate");
const swipeHttp503Rate = new Rate("swipe_http_503_rate");

export const options = {
  scenarios: {
    reciprocal_swipes: {
      executor: "constant-vus",
      vus: VUS,
      duration: DURATION,
      gracefulStop: "10s",
    },
  },
  thresholds: {
    swipe_response_time: ["avg<=200"],
    swipe_http_500_rate: ["rate==0"],
    swipe_http_error_rate: ["rate==0"],
    checks: ["rate==1"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

function createLoadTestUser(index) {
  const response = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      name: `K6 Swipe ${index + 1}`,
      email: `k6-swipe-${RUN_ID}-${index + 1}@example.test`,
      password: "LoadTest123",
      birthDate: "1995-01-01",
      gender: index % 2 === 0 ? "woman" : "man",
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "test-user-setup" },
    },
  );

  if (response.status !== 201) {
    fail(
      `Could not create load-test user ${index + 1}. HTTP ${response.status}: ${response.body}`,
    );
  }

  const payload = response.json();
  if (!payload?.token || !payload?.user?.id) {
    fail(`Load-test user ${index + 1} has an invalid registration response.`);
  }

  return { id: payload.user.id, token: payload.token };
}

export function setup() {
  const participants = [];

  for (let index = 0; index < VUS; index += 1) {
    participants.push(createLoadTestUser(index));
  }

  return { participants };
}

export default function ({ participants }) {
  const userIndex = (exec.vu.idInTest - 1) % participants.length;
  const user = participants[userIndex];
  const partnerIndex = userIndex % 2 === 0 ? userIndex + 1 : userIndex - 1;
  const partner = participants[partnerIndex];

  const response = http.post(
    `${BASE_URL}/api/v1/swipes`,
    JSON.stringify({ targetId: partner.id, type: "like" }),
    {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
      tags: { endpoint: "swipes" },
      timeout: "10s",
    },
  );

  swipeRequests.add(1);
  swipeResponseTime.add(response.timings.duration);
  swipeHttp500Rate.add(response.status === 500);
  swipeHttp503Rate.add(response.status === 503);
  swipeHttpErrorRate.add(response.status !== 201);

  check(response, {
    "swipe returns HTTP 201": (result) => result.status === 201,
    "swipe response contains isMatch": (result) => {
      const body = result.json();
      return typeof body?.isMatch === "boolean";
    },
  });
}

function pickMetric(data, name) {
  const metric = data.metrics[name];
  if (!metric) {
    return null;
  }

  return {
    type: metric.type,
    contains: metric.contains,
    values: metric.values,
    thresholds: metric.thresholds,
  };
}

function formatRate(metric) {
  const rate = metric?.values?.rate;
  return typeof rate === "number" ? `${(rate * 100).toFixed(2)}%` : "n/a";
}

function formatMs(metric) {
  const avg = metric?.values?.avg;
  return typeof avg === "number" ? `${avg.toFixed(2)} ms` : "n/a";
}

export function handleSummary(data) {
  const metricNames = [
    "checks",
    "swipe_requests",
    "swipe_response_time",
    "swipe_http_error_rate",
    "swipe_http_500_rate",
    "swipe_http_503_rate",
    "http_req_duration",
    "http_req_failed",
    "http_reqs",
  ];

  const metrics = {};
  for (const metricName of metricNames) {
    metrics[metricName] = pickMetric(data, metricName);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    vus: VUS,
    duration: DURATION,
    note: "Sanitized summary. setup_data and JWT tokens are intentionally excluded.",
    metrics,
  };

  const swipeTime = metrics.swipe_response_time;
  const http500 = metrics.swipe_http_500_rate;
  const http503 = metrics.swipe_http_503_rate;
  const httpErrors = metrics.swipe_http_error_rate;

  const stdout = [
    "\nSwipe load test summary",
    `Average swipe response: ${formatMs(swipeTime)}`,
    `HTTP error rate: ${formatRate(httpErrors)}`,
    `HTTP 500 rate: ${formatRate(http500)}`,
    `HTTP 503 rate: ${formatRate(http503)}`,
    "Sanitized JSON report: load-tests/results/swipes-summary.json",
    "",
  ].join("\n");

  return {
    stdout,
    "load-tests/results/swipes-summary.json": `${JSON.stringify(report, null, 2)}\n`,
  };
}
