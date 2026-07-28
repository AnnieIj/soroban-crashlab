/**
 * Integration tests for /api/artifacts/validate endpoint
 * 
 * Tests the API validation logic including metadata validation,
 * size checks, path safety, and error handling.
 */

import * as assert from 'node:assert/strict';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';
import type { ArtifactMetadata } from '../../../utils/artifact-fs-adapter';

// Helper to create a mock NextRequest
function createMockRequest(body: unknown): NextRequest {
  const url = 'http://localhost:3000/api/artifacts/validate';
  return {
    json: async () => body,
    url,
  } as NextRequest;
}

const runAssertions = async (): Promise<void> => {
  // Test POST - happy path with valid metadata
  const validMetadata: ArtifactMetadata = {
    id: 'artifact-run-123-crash-0-1234567890',
    runId: 'run-123',
    type: 'crash',
    size: 1024,
    timestamp: Date.now(),
    path: 'artifacts/run-123/artifact-run-123-crash-0-1234567890.crash.json',
  };

  const req1 = createMockRequest({ metadata: validMetadata });
  const res1 = await POST(req1);
  const data1 = await res1.json();
  
  assert.equal(res1.status, 200);
  assert.equal(data1.valid, true);
  assert.equal(data1.errors.length, 0);

  // Test POST - valid metadata with contentSize matching
  const req2 = createMockRequest({ 
    metadata: validMetadata, 
    contentSize: 1024 
  });
  const res2 = await POST(req2);
  const data2 = await res2.json();
  
  assert.equal(res2.status, 200);
  assert.equal(data2.valid, true);
  assert.equal(data2.errors.length, 0);

  // Test POST - large artifact generates warning
  const largeMetadata: ArtifactMetadata = {
    ...validMetadata,
    size: 6_000_000, // 6MB, above warning threshold
  };
  
  const req3 = createMockRequest({ metadata: largeMetadata });
  const res3 = await POST(req3);
  const data3 = await res3.json();
  
  assert.equal(res3.status, 200);
  assert.equal(data3.valid, true);
  assert.ok(data3.warnings && data3.warnings.length > 0);
  assert.ok(data3.warnings![0].includes('large'));

  // Test POST - missing metadata
  const req4 = createMockRequest({});
  const res4 = await POST(req4);
  const data4 = await res4.json();
  
  assert.equal(res4.status, 400);
  assert.equal(data4.valid, false);
  assert.ok(data4.errors.some((e: string) => e.includes('metadata')));

  // Test POST - invalid metadata structure
  const invalidMetadata = {
    id: '', // Invalid: empty string
    runId: 123, // Invalid: should be string
    type: 'invalid-type', // Invalid: not in allowed types
    size: -100, // Invalid: negative size
    timestamp: -1, // Invalid: negative timestamp
    path: '', // Invalid: empty path
  };
  
  const req5 = createMockRequest({ metadata: invalidMetadata });
  const res5 = await POST(req5);
  const data5 = await res5.json();
  
  assert.equal(res5.status, 400);
  assert.equal(data5.valid, false);
  assert.ok(data5.errors.length > 0);

  // Test POST - size exceeds maximum
  const tooLargeMetadata: ArtifactMetadata = {
    ...validMetadata,
    size: 11_000_000, // Exceeds 10MB limit
  };
  
  const req6 = createMockRequest({ metadata: tooLargeMetadata });
  const res6 = await POST(req6);
  const data6 = await res6.json();
  
  assert.equal(res6.status, 400);
  assert.equal(data6.valid, false);
  assert.ok(data6.errors.some((e: string) => e.includes('exceeds maximum')));

  // Test POST - contentSize mismatch
  const req7 = createMockRequest({ 
    metadata: validMetadata, 
    contentSize: 2048 // Doesn't match metadata.size of 1024
  });
  const res7 = await POST(req7);
  const data7 = await res7.json();
  
  assert.equal(res7.status, 400);
  assert.equal(data7.valid, false);
  assert.ok(data7.errors.some((e: string) => e.includes('does not match')));

  // Test POST - unsafe path (path traversal attempt)
  const unsafeMetadata: ArtifactMetadata = {
    ...validMetadata,
    path: '../../../etc/passwd', // Path traversal attack
  };
  
  const req8 = createMockRequest({ metadata: unsafeMetadata });
  const res8 = await POST(req8);
  const data8 = await res8.json();
  
  assert.equal(res8.status, 400);
  assert.equal(data8.valid, false);
  assert.ok(data8.errors.some((e: string) => e.includes('unsafe')));

  // Test POST - unsafe path (absolute path)
  const absolutePathMetadata: ArtifactMetadata = {
    ...validMetadata,
    path: '/absolute/path/file.json',
  };
  
  const req9 = createMockRequest({ metadata: absolutePathMetadata });
  const res9 = await POST(req9);
  const data9 = await res9.json();
  
  assert.equal(res9.status, 400);
  assert.equal(data9.valid, false);

  // Test POST - unsafe path (Windows absolute path)
  const windowsPathMetadata: ArtifactMetadata = {
    ...validMetadata,
    path: 'C:\\Windows\\System32\\file.json',
  };
  
  const req10 = createMockRequest({ metadata: windowsPathMetadata });
  const res10 = await POST(req10);
  const data10 = await res10.json();
  
  assert.equal(res10.status, 400);
  assert.equal(data10.valid, false);

  // Test POST - invalid request body (not JSON object)
  const req11 = createMockRequest(null);
  const res11 = await POST(req11);
  const data11 = await res11.json();
  
  assert.equal(res11.status, 400);
  assert.equal(data11.valid, false);
  assert.ok(data11.errors.some((e: string) => e.includes('JSON object')));

  // Test POST - malformed JSON handling
  const req12 = {
    json: async () => {
      throw new Error('Invalid JSON');
    },
    url: 'http://localhost:3000/api/artifacts/validate',
  } as NextRequest;
  
  const res12 = await POST(req12);
  const data12 = await res12.json();
  
  assert.equal(res12.status, 500);
  assert.equal(data12.valid, false);
  assert.ok(data12.errors.some((e: string) => e.includes('error')));

  // Test POST - all artifact types are valid
  const types = ['crash', 'seed', 'trace', 'coverage'] as const;
  for (const type of types) {
    const typedMetadata: ArtifactMetadata = {
      ...validMetadata,
      type,
      path: `artifacts/run-123/artifact.${type}.json`,
    };
    
    const req = createMockRequest({ metadata: typedMetadata });
    const res = await POST(req);
    const data = await res.json();
    
    assert.equal(res.status, 200, `Type ${type} should be valid`);
    assert.equal(data.valid, true, `Type ${type} should be valid`);
  }

  // Test POST - zero size is valid
  const zeroSizeMetadata: ArtifactMetadata = {
    ...validMetadata,
    size: 0,
  };
  
  const req13 = createMockRequest({ metadata: zeroSizeMetadata });
  const res13 = await POST(req13);
  const data13 = await res13.json();
  
  assert.equal(res13.status, 200);
  assert.equal(data13.valid, true);

  // Test POST - exactly at size limit is valid
  const maxSizeMetadata: ArtifactMetadata = {
    ...validMetadata,
    size: 10_485_760, // Exactly 10MB
  };
  
  const req14 = createMockRequest({ metadata: maxSizeMetadata });
  const res14 = await POST(req14);
  const data14 = await res14.json();
  
  assert.equal(res14.status, 200);
  assert.equal(data14.valid, true);

  // Test POST - one byte over limit fails
  const overLimitMetadata: ArtifactMetadata = {
    ...validMetadata,
    size: 10_485_761, // One byte over 10MB
  };
  
  const req15 = createMockRequest({ metadata: overLimitMetadata });
  const res15 = await POST(req15);
  const data15 = await res15.json();
  
  assert.equal(res15.status, 400);
  assert.equal(data15.valid, false);

  // Test POST - nested paths are valid
  const nestedMetadata: ArtifactMetadata = {
    ...validMetadata,
    path: 'artifacts/run-123/nested/deep/artifact.json',
  };
  
  const req16 = createMockRequest({ metadata: nestedMetadata });
  const res16 = await POST(req16);
  const data16 = await res16.json();
  
  assert.equal(res16.status, 200);
  assert.equal(data16.valid, true);

  // Test GET - health check
  const getRes = await GET();
  const getData = await getRes.json();
  
  assert.equal(getRes.status, 200);
  assert.equal(getData.endpoint, '/api/artifacts/validate');
  assert.equal(getData.method, 'POST');
  assert.ok(getData.description.length > 0);

  // Test POST - multiple validation errors
  const multiErrorMetadata = {
    id: '', // Error 1
    runId: '', // Error 2
    type: 'bad', // Error 3
    size: -1, // Error 4
    timestamp: -1, // Error 5
    path: '', // Error 6
  };
  
  const req17 = createMockRequest({ metadata: multiErrorMetadata });
  const res17 = await POST(req17);
  const data17 = await res17.json();
  
  assert.equal(res17.status, 400);
  assert.equal(data17.valid, false);
  assert.ok(data17.errors.length >= 5, 'Should have multiple validation errors');

  // Test POST - contentSize without metadata.size
  const noSizeMetadata = { ...validMetadata };
  delete (noSizeMetadata as Partial<ArtifactMetadata>).size;
  
  const req18 = createMockRequest({ 
    metadata: noSizeMetadata, 
    contentSize: 1024 
  });
  const res18 = await POST(req18);
  const data18 = await res18.json();
  
  // Should fail because metadata.size is required
  assert.equal(res18.status, 400);
  assert.equal(data18.valid, false);
};

// Run the tests
(async () => {
  try {
    await runAssertions();
    console.log('route.test.ts: all assertions passed');
  } catch (error) {
    console.error('route.test.ts: test failed:', error);
    process.exit(1);
  }
})();
