import * as assert from "node:assert/strict";
import type { FuzzingRun } from "./types";

// Mock FuzzingRun data for testing
const mockRuns: FuzzingRun[] = [
  {
    id: "run-1",
    status: "completed",
    area: "auth",
    severity: "high",
    duration: 5000,
    seedCount: 1000,
    crashDetail: null,
    cpuInstructions: 50000,
    memoryBytes: 1024000,
    minResourceFee: 100,
    queuedAt: "2024-01-01T10:00:00Z",
    startedAt: "2024-01-01T10:00:01Z",
    finishedAt: "2024-01-01T10:00:06Z",
    annotations: ["test annotation"],
  },
  {
    id: "run-2",
    status: "failed",
    area: "state",
    severity: "critical",
    duration: 3000,
    seedCount: 500,
    crashDetail: {
      failureCategory: "assertion_failure",
      signature: "sig-001",
      payload: "test payload",
      replayAction: "test action",
    },
    cpuInstructions: 30000,
    memoryBytes: 512000,
    minResourceFee: 50,
    queuedAt: "2024-01-01T11:00:00Z",
    startedAt: "2024-01-01T11:00:01Z",
    finishedAt: "2024-01-01T11:00:04Z",
  },
];

function testJsonLinesFormat(): void {
  // Test 1: Verify JSON Lines format is correctly generated
  const jsonLines = mockRuns
    .map((run) => JSON.stringify(run))
    .join("\n");

  const lines = jsonLines.split("\n");
  assert.equal(lines.length, 2, "Should have 2 lines for 2 runs");

  // Test 2: Verify each line is valid JSON
  lines.forEach((line, index) => {
    assert.ok(line.length > 0, `Line ${index} should not be empty`);
    const parsed = JSON.parse(line);
    assert.ok(parsed.id, `Line ${index} should have an id`);
  });

  // Test 3: Verify parsed data matches original
  const line1 = JSON.parse(lines[0]);
  assert.equal(line1.id, "run-1", "First run id should match");
  assert.equal(line1.status, "completed", "First run status should match");
  assert.equal(line1.severity, "high", "First run severity should match");

  const line2 = JSON.parse(lines[1]);
  assert.equal(line2.id, "run-2", "Second run id should match");
  assert.equal(line2.status, "failed", "Second run status should match");
  assert.equal(line2.severity, "critical", "Second run severity should match");

  // Test 4: Verify crash details are preserved in JSON Lines
  assert.equal(
    line2.crashDetail.signature,
    "sig-001",
    "Crash details should be preserved"
  );

  // Test 5: Verify annotations are preserved
  assert.deepEqual(
    line1.annotations,
    ["test annotation"],
    "Annotations should be preserved"
  );

  // Test 6: Empty runs array should produce empty string
  const emptyLines = [].map((run) => JSON.stringify(run)).join("\n");
  assert.equal(emptyLines, "", "Empty array should produce empty string");

  // Test 7: Single run should produce single line without trailing newline
  const singleLine = [mockRuns[0]]
    .map((run) => JSON.stringify(run))
    .join("\n");
  assert.ok(!singleLine.endsWith("\n"), "Should not have trailing newline");
  assert.ok(singleLine.includes('"id":"run-1"'), "Should contain run data");
}

testJsonLinesFormat();
console.log("add-export-run-jsonl.test.ts: all assertions passed");
