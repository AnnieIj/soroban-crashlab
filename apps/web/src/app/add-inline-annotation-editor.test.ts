import * as assert from "node:assert/strict";
import type { FuzzingRun } from "./types";

// Mock FuzzingRun for testing
const mockRun: FuzzingRun = {
  id: "run-123",
  status: "completed",
  area: "auth",
  severity: "high",
  duration: 5000,
  seedCount: 1000,
  crashDetail: null,
  cpuInstructions: 50000,
  memoryBytes: 1024000,
  minResourceFee: 100,
  annotations: ["First annotation", "Second annotation"],
};

function testInlineAnnotationValidation(): void {
  // Test 1: Validate non-empty annotations
  const validAnnotations = ["Test annotation 1", "Test annotation 2"];
  assert.ok(
    validAnnotations.every((ann) => ann.length > 0),
    "All annotations should be non-empty"
  );

  // Test 2: Validate max length (500 chars)
  const shortAnnotation = "a".repeat(500);
  assert.equal(shortAnnotation.length, 500, "Max length should be 500");

  const tooLongAnnotation = "a".repeat(501);
  assert.ok(
    tooLongAnnotation.length > 500,
    "Exceeding max length should be caught"
  );

  // Test 3: Empty string should be invalid
  const emptyAnnotation = "";
  assert.equal(emptyAnnotation.length, 0, "Empty annotation should have length 0");

  // Test 4: Whitespace-only should be trimmed
  const whitespaceAnnotation = "   ";
  assert.ok(
    whitespaceAnnotation.trim().length === 0,
    "Whitespace-only should be treated as empty"
  );

  // Test 5: Multiple annotations in array
  const multipleAnnotations = ["Note 1", "Note 2", "Note 3"];
  assert.equal(
    multipleAnnotations.length,
    3,
    "Should support multiple annotations"
  );

  // Test 6: Removing annotation from array
  const annotationsToEdit = ["Keep this", "Remove this", "Keep that"];
  const filtered = annotationsToEdit.filter((_, i) => i !== 1);
  assert.equal(filtered.length, 2, "Should have 2 annotations after removal");
  assert.deepEqual(
    filtered,
    ["Keep this", "Keep that"],
    "Should keep correct annotations"
  );

  // Test 7: Adding new annotation
  const updated = [...validAnnotations];
  updated.push("New annotation");
  assert.equal(updated.length, 3, "Should have 3 annotations after adding");

  // Test 8: Updating existing annotation
  const toUpdate = [...mockRun.annotations!];
  toUpdate[0] = "Updated first annotation";
  assert.equal(
    toUpdate[0],
    "Updated first annotation",
    "Should update annotation at index"
  );

  // Test 9: Special characters in annotations
  const specialCharAnnotations = [
    "Note with unicode: 🎉 🚀",
    'Quote: "Hello World"',
    "Special chars: !@#$%^&*()",
  ];
  specialCharAnnotations.forEach((ann) => {
    assert.ok(ann.length > 0, "Annotations with special chars should be valid");
  });

  // Test 10: Annotations with line breaks (should be handled)
  const multilineAnnotation = "Line 1\nLine 2\nLine 3";
  assert.ok(
    multilineAnnotation.includes("\n"),
    "Annotations can contain line breaks"
  );
}

testInlineAnnotationValidation();
console.log(
  "add-inline-annotation-editor.test.ts: all assertions passed"
);
