import http from "k6/http";
import { check } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";

export const options = {
  vus: 50,
  duration: "10s",
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

const success = new Counter("registrations_success");
const conflict = new Counter("registrations_conflict");
const failed = new Counter("registrations_failed");
const errorRate = new Rate("error_rate");
const duration = new Trend("response_duration");

let counter = 0;

function generateBody() {
  counter++;

  const unique = `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;

  return JSON.stringify({
    email: `loadtest-${unique}@example.com`,
    password: "Password123!",
  });
}

export default function () {
  const url = "http://localhost:8000/api/v1/auth/login";

  const payload = generateBody();

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post(url, payload, params);

  duration.add(res.timings.duration);

  const isSuccess = res.status >= 200 && res.status < 300;
  const isConflict = res.status === 400 || res.status === 409;
  const isError = !isSuccess && !isConflict;

  if (isSuccess) success.add(1);
  else if (isConflict) conflict.add(1);
  else failed.add(1);

  errorRate.add(isError ? 1 : 0);

  check(res, {
    "status valid": (r) => r.status > 0,
    "response exists": (r) => r.body && r.body.length > 0,
  });

  if (isError) {
    console.log(`ERROR: status=${res.status} body=${res.body}`);
  }
}

export function setup() {
  console.log("Starting registration load test");
}
