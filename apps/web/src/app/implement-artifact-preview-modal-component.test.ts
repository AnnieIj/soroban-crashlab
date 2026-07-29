import { formatSize, formatDate, generatePreviewContent, Artifact, ContentType } from "./implement-artifact-preview-modal-component";
import {
  detectContentType,
  formatJsonContent,
  formatHexDump,
  decodeContent,
} from "@/lib/artifact-content-utils";

// Test utilities
function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: `art-${Math.random().toString(36).substr(2, 9)}`,
    name: "test-artifact.bin",
    type: "seed",
    size: 1024,
    updatedAt: "2026-04-23T10:00:00Z",
    runId: "run-1000",
    content_hash: "a1b2c3d4",
    ...overrides,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function strToBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

// Test: formatSize utility function
function testFormatSize(): void {
  assert(formatSize(0) === "0 B", "Zero bytes should format correctly");
  assert(formatSize(512) === "512 B", "Bytes under 1KB should format correctly");
  assert(formatSize(1024) === "1.0 KB", "Exactly 1KB should format correctly");
  assert(formatSize(2048) === "2.0 KB", "2KB should format correctly");
  assert(formatSize(1536) === "1.5 KB", "1.5KB should format correctly");
  assert(formatSize(1024 * 1024) === "1.0 MB", "Exactly 1MB should format correctly");
  assert(formatSize(1572864) === "1.5 MB", "1.5MB should format correctly");
  assert(formatSize(1024 * 1024 * 2.5) === "2.5 MB", "2.5MB should format correctly");
  
  console.log("✓ testFormatSize passed");
}

// Test: formatDate utility function
function testFormatDate(): void {
  const validIso = "2026-04-23T10:30:00Z";
  const formatted = formatDate(validIso);
  
  // Should return a formatted date string, not the original ISO string
  assert(formatted !== validIso, "Valid ISO date should be formatted");
  assert(formatted.length > 0, "Formatted date should not be empty");
  
  // Test invalid date fallback
  const invalidIso = "invalid-date";
  const fallback = formatDate(invalidIso);
  assert(fallback === invalidIso, "Invalid date should return original string");
  
  console.log("✓ testFormatDate passed");
}

// Test: generatePreviewContent for seed artifacts
function testGeneratePreviewContentSeed(): void {
  const seedArtifact = makeArtifact({
    id: "seed-test-123",
    type: "seed",
    name: "test-seed.bin",
  });
  
  const content = generatePreviewContent(seedArtifact);
  
  assert(content.length > 0, "Seed preview should generate content");
  assert(content.includes("00000000"), "Seed preview should include hex addresses");
  assert(content.includes("|"), "Seed preview should include ASCII column separators");
  
  // Should be deterministic - same input produces same output
  const content2 = generatePreviewContent(seedArtifact);
  assert(content === content2, "Seed preview should be deterministic");
  
  console.log("✓ testGeneratePreviewContentSeed passed");
}

// Test: generatePreviewContent for log artifacts
function testGeneratePreviewContentLog(): void {
  const logArtifact = makeArtifact({
    id: "log-test-456",
    type: "log",
    name: "fuzzer.log",
  });
  
  const content = generatePreviewContent(logArtifact);
  
  assert(content.length > 0, "Log preview should generate content");
  assert(content.includes("[INFO]") || content.includes("[DEBUG]") || content.includes("[WARN]") || content.includes("[ERROR]"), "Log preview should include log levels");
  assert(content.includes("T") && content.includes("Z"), "Log preview should include ISO timestamps");
  
  // Should contain multiple lines
  const lines = content.split("\n");
  assert(lines.length > 1, "Log preview should contain multiple lines");
  
  console.log("✓ testGeneratePreviewContentLog passed");
}

// Test: generatePreviewContent for trace artifacts
function testGeneratePreviewContentTrace(): void {
  const traceArtifact = makeArtifact({
    id: "trace-test-789",
    type: "trace",
    name: "execution.json",
  });
  
  const content = generatePreviewContent(traceArtifact);
  
  assert(content.length > 0, "Trace preview should generate content");
  
  // Should be valid JSON
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    assert(false, "Trace preview should be valid JSON");
  }
  
  assert(parsed.artifact_id === traceArtifact.id, "Trace preview should include artifact ID");
  assert(Array.isArray(parsed.execution_steps), "Trace preview should include execution steps");
  assert(parsed.execution_steps.length > 0, "Trace preview should have at least one execution step");
  
  console.log("✓ testGeneratePreviewContentTrace passed");
}

// Test: generatePreviewContent for coverage artifacts
function testGeneratePreviewContentCoverage(): void {
  const coverageArtifact = makeArtifact({
    id: "coverage-test-abc",
    type: "coverage",
    name: "coverage-report.txt",
  });
  
  const content = generatePreviewContent(coverageArtifact);
  
  assert(content.length > 0, "Coverage preview should generate content");
  assert(content.includes("Coverage Report"), "Coverage preview should include report header");
  assert(content.includes("Lines"), "Coverage preview should include line coverage");
  assert(content.includes("Branches"), "Coverage preview should include branch coverage");
  assert(content.includes("Functions"), "Coverage preview should include function coverage");
  assert(content.includes("%"), "Coverage preview should include percentage values");
  
  console.log("✓ testGeneratePreviewContentCoverage passed");
}

// Test: generatePreviewContent for bundle artifacts
function testGeneratePreviewContentBundle(): void {
  const bundleArtifact = makeArtifact({
    id: "bundle-test-def",
    type: "bundle",
    name: "archive.tar.gz",
  });
  
  const content = generatePreviewContent(bundleArtifact);
  
  assert(content.length > 0, "Bundle preview should generate content");
  assert(content.includes("00000000"), "Bundle preview should include hex addresses (like seed)");
  assert(content.includes("|"), "Bundle preview should include ASCII column separators");
  
  console.log("✓ testGeneratePreviewContentBundle passed");
}

// Test: generatePreviewContent deterministic behavior
function testGeneratePreviewContentDeterministic(): void {
  const artifact1 = makeArtifact({ id: "deterministic-test", type: "log" });
  const artifact2 = makeArtifact({ id: "deterministic-test", type: "log" });
  
  const content1 = generatePreviewContent(artifact1);
  const content2 = generatePreviewContent(artifact2);
  
  assert(content1 === content2, "Same artifact ID should produce identical content");
  
  // Different IDs should produce different content
  const artifact3 = makeArtifact({ id: "different-test", type: "log" });
  const content3 = generatePreviewContent(artifact3);
  
  assert(content1 !== content3, "Different artifact IDs should produce different content");
  
  console.log("✓ testGeneratePreviewContentDeterministic passed");
}

// Test: Edge cases for generatePreviewContent
function testGeneratePreviewContentEdgeCases(): void {
  // Empty ID
  const emptyIdArtifact = makeArtifact({ id: "", type: "seed" });
  const emptyContent = generatePreviewContent(emptyIdArtifact);
  assert(emptyContent.length >= 0, "Empty ID should not crash preview generation");
  
  // Very short ID
  const shortIdArtifact = makeArtifact({ id: "a", type: "log" });
  const shortContent = generatePreviewContent(shortIdArtifact);
  assert(shortContent.length > 0, "Short ID should still generate content");
  
  // Very long ID
  const longId = "a".repeat(100);
  const longIdArtifact = makeArtifact({ id: longId, type: "trace" });
  const longContent = generatePreviewContent(longIdArtifact);
  assert(longContent.length > 0, "Long ID should generate content");
  
  // Special characters in ID
  const specialIdArtifact = makeArtifact({ id: "test-123_$%^", type: "coverage" });
  const specialContent = generatePreviewContent(specialIdArtifact);
  assert(specialContent.length > 0, "Special characters in ID should not break generation");
  
  console.log("✓ testGeneratePreviewContentEdgeCases passed");
}

// Test: Artifact interface validation
function testArtifactInterface(): void {
  const artifact = makeArtifact({
    id: "interface-test",
    name: "test.bin",
    type: "seed",
    size: 2048,
    updatedAt: "2026-04-23T15:30:00Z",
    runId: "run-123",
    content_hash: "abc123def",
  });
  
  // Verify all required fields are present
  assert(typeof artifact.id === "string", "Artifact ID should be string");
  assert(typeof artifact.name === "string", "Artifact name should be string");
  assert(["seed", "log", "trace", "coverage", "bundle"].includes(artifact.type), "Artifact type should be valid");
  assert(typeof artifact.size === "number", "Artifact size should be number");
  assert(typeof artifact.updatedAt === "string", "Artifact updatedAt should be string");
  
  // Verify optional fields
  assert(typeof artifact.runId === "string" || artifact.runId === undefined, "Artifact runId should be string or undefined");
  assert(typeof artifact.content_hash === "string" || artifact.content_hash === undefined, "Artifact content_hash should be string or undefined");
  
  console.log("✓ testArtifactInterface passed");
}

// Test: Large artifact size formatting
function testFormatSizeLarge(): void {
  const gigabyte = 1024 * 1024 * 1024;
  
  // Test very large sizes (should still work with MB formatting)
  assert(formatSize(gigabyte) === "1024.0 MB", "1GB should format as 1024.0 MB");
  assert(formatSize(gigabyte * 2.5) === "2560.0 MB", "2.5GB should format as 2560.0 MB");
  
  // Test edge case: exactly at MB boundary
  const exactMB = 1024 * 1024;
  assert(formatSize(exactMB) === "1.0 MB", "Exactly 1MB should format correctly");
  assert(formatSize(exactMB - 1) === "1024.0 KB", "Just under 1MB should format as KB");
  
  console.log("✓ testFormatSizeLarge passed");
}

// Test: Date formatting edge cases
function testFormatDateEdgeCases(): void {
  // Test various valid ISO formats
  const formats = [
    "2026-04-23T10:30:00Z",
    "2026-04-23T10:30:00.000Z",
    "2026-04-23T10:30:00+00:00",
    "2026-12-31T23:59:59Z",
  ];
  
  formats.forEach(format => {
    const result = formatDate(format);
    assert(result !== format, `Format ${format} should be transformed`);
    assert(result.length > 0, `Format ${format} should produce non-empty result`);
  });
  
  // Test invalid formats
  const invalidFormats = [
    "",
    "not-a-date",
    "2026-13-45T25:70:70Z", // Invalid date components
    "2026-04-23", // Missing time
  ];
  
  invalidFormats.forEach(format => {
    const result = formatDate(format);
    assert(result === format, `Invalid format ${format} should return original string`);
  });
  
  console.log("✓ testFormatDateEdgeCases passed");
}

// === NEW TESTS for content type detection and preview ===

// Test: ContentType type includes all expected values
function testContentTypeType(): void {
  // Verify that the type includes all expected values
  const contentTypes: ContentType[] = ["json", "text", "hex", "unknown"];
  assert(contentTypes.length === 4, "ContentType should have 4 variants");
  assert(contentTypes.includes("json"), "ContentType should include json");
  assert(contentTypes.includes("text"), "ContentType should include text");
  assert(contentTypes.includes("hex"), "ContentType should include hex");
  assert(contentTypes.includes("unknown"), "ContentType should include unknown");
  
  console.log("✓ testContentTypeType passed");
}

// Test: detectContentType detects JSON content
function testDetectContentTypeJson(): void {
  // Valid JSON object
  const jsonObj = strToBuffer('{"name":"test","value":42}');
  assert(detectContentType(jsonObj) === "json", "Should detect JSON object");
  
  // Valid JSON array
  const jsonArr = strToBuffer('[1,2,3,4]');
  assert(detectContentType(jsonArr) === "json", "Should detect JSON array");
  
  // Nested JSON
  const jsonNested = strToBuffer('{"a":{"b":[1,2]}}');
  assert(detectContentType(jsonNested) === "json", "Should detect nested JSON");
  
  console.log("✓ testDetectContentTypeJson passed");
}

// Test: detectContentType detects text content
function testDetectContentTypeText(): void {
  // Plain text
  const plainText = strToBuffer("Hello, World!");
  assert(detectContentType(plainText) === "text", "Should detect plain text");
  
  // Multi-line text
  const multiLine = strToBuffer("Line 1\nLine 2\nLine 3");
  assert(detectContentType(multiLine) === "text", "Should detect multi-line text");
  
  // Log content
  const logContent = strToBuffer("2026-04-23 [INFO] Fuzzer started");
  assert(detectContentType(logContent) === "text", "Should detect log text");
  
  // Empty content
  const empty = strToBuffer("");
  assert(detectContentType(empty) === "text", "Should treat empty content as text");
  
  console.log("✓ testDetectContentTypeText passed");
}

// Test: detectContentType detects hex/binary content
function testDetectContentTypeHex(): void {
  // Binary data with null bytes
  const binary = new Uint8Array([0x00, 0x01, 0x02, 0xFF, 0xFE]).buffer;
  assert(detectContentType(binary) === "hex", "Should detect binary data");
  
  // Binary data starting with { but not valid JSON
  const invalidJsonBinary = new Uint8Array([0x7b, 0x00, 0x00, 0x00]).buffer;
  assert(detectContentType(invalidJsonBinary) === "hex", "Should detect invalid JSON starting with { as binary");
  
  console.log("✓ testDetectContentTypeHex passed");
}

// Test: formatJsonContent pretty-prints JSON
function testFormatJsonContentPrettyPrint(): void {
  const input = '{"name":"test","value":42,"nested":{"flag":true}}';
  const formatted = formatJsonContent(input);
  
  // Should be indented
  assert(formatted.includes("\n"), "Formatted JSON should have newlines");
  assert(formatted.includes("  "), "Formatted JSON should have indentation");
  
  // Should still be valid JSON
  const parsed = JSON.parse(formatted);
  assert(parsed.name === "test", "Should preserve string values");
  assert(parsed.value === 42, "Should preserve number values");
  assert(parsed.nested.flag === true, "Should preserve boolean values");
  
  // Invalid JSON should return original
  const invalid = "not json";
  assert(formatJsonContent(invalid) === invalid, "Invalid JSON should return original string");
  
  console.log("✓ testFormatJsonContentPrettyPrint passed");
}

// Test: formatHexDump produces correct output
function testFormatHexDumpBasic(): void {
  const bytes = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const dump = formatHexDump(bytes.buffer);
  
  assert(dump.includes("00000000"), "Hex dump should start with offset 0");
  assert(dump.includes("48"), "Hex dump should contain byte 0x48 ('H')");
  assert(dump.includes("65"), "Hex dump should contain byte 0x65 ('e')");
  assert(dump.includes("6C"), "Hex dump should contain byte 0x6C ('l')");
  assert(dump.includes("6F"), "Hex dump should contain byte 0x6F ('o')");
  assert(dump.includes("|"), "Hex dump should have ASCII column");
  assert(dump.includes("Hello"), "Hex dump should show readable ASCII");
  
  console.log("✓ testFormatHexDumpBasic passed");
}

// Test: formatHexDump handles truncation
function testFormatHexDumpTruncation(): void {
  // 100 bytes with maxBytes=48
  const buffer = new Uint8Array(100).buffer;
  const dump = formatHexDump(buffer, 48);
  
  assert(dump.includes("..."), "Truncated dump should show ellipsis");
  assert(dump.includes("more bytes"), "Truncated dump should mention remaining bytes");
  
  console.log("✓ testFormatHexDumpTruncation passed");
}

// Test: decodeContent decodes ArrayBuffer to string
function testDecodeContent(): void {
  const encoder = new TextEncoder();
  const hello = encoder.encode("Hello, World!").buffer;
  assert(decodeContent(hello) === "Hello, World!", "Should decode basic text");
  
  const empty = new ArrayBuffer(0);
  assert(decodeContent(empty) === "", "Empty buffer should decode to empty string");
  
  const unicode = encoder.encode("🚀 Stellar 🚀").buffer;
  assert(decodeContent(unicode) === "🚀 Stellar 🚀", "Should decode Unicode text");
  
  console.log("✓ testDecodeContent passed");
}

// Test: Artifact with contentType field
function testArtifactContentTypeField(): void {
  const jsonArtifact: Artifact = {
    id: "json-test",
    name: "config.json",
    type: "seed",
    contentType: "json",
    size: 4096,
    updatedAt: "2026-04-23T10:00:00Z",
  };
  
  assert(jsonArtifact.contentType === "json", "Artifact should support contentType field");
  assert(typeof jsonArtifact.id === "string", "Artifact should still have required fields");
  
  const textArtifact: Artifact = {
    id: "text-test",
    name: "readme.txt",
    type: "log",
    contentType: "text",
    size: 2048,
    updatedAt: "2026-04-23T10:00:00Z",
  };
  
  assert(textArtifact.contentType === "text", "Artifact should support text contentType");
  
  const hexArtifact: Artifact = {
    id: "hex-test",
    name: "binary.bin",
    type: "seed",
    contentType: "hex",
    size: 1024,
    updatedAt: "2026-04-23T10:00:00Z",
  };
  
  assert(hexArtifact.contentType === "hex", "Artifact should support hex contentType");
  
  console.log("✓ testArtifactContentTypeField passed");
}

// Run all tests
function runAllTests(): void {
  console.log("Running Artifact Preview Modal Component Tests...\n");
  
  try {
    // Original tests
    testFormatSize();
    testFormatDate();
    testGeneratePreviewContentSeed();
    testGeneratePreviewContentLog();
    testGeneratePreviewContentTrace();
    testGeneratePreviewContentCoverage();
    testGeneratePreviewContentBundle();
    testGeneratePreviewContentDeterministic();
    testGeneratePreviewContentEdgeCases();
    testArtifactInterface();
    testFormatSizeLarge();
    testFormatDateEdgeCases();
    
    // New content type tests
    testContentTypeType();
    testDetectContentTypeJson();
    testDetectContentTypeText();
    testDetectContentTypeHex();
    testFormatJsonContentPrettyPrint();
    testFormatHexDumpBasic();
    testFormatHexDumpTruncation();
    testDecodeContent();
    testArtifactContentTypeField();
    
    console.log("\n✅ All Artifact Preview Modal Component tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Export for external test runners
export {
  formatSize,
  formatDate,
  generatePreviewContent,
  makeArtifact,
  runAllTests,
};

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
}
