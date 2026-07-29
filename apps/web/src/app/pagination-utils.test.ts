import {
  computeTotalPages,
  getPageSlice,
  clampPage,
  buildPaginationState,
} from './pagination-utils';

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

function assertThrows(fn: () => void, validator?: (error: unknown) => boolean): void {
  try {
    fn();
    throw new Error('Expected function to throw but it did not');
  } catch (error) {
    if (validator && !validator(error)) {
      throw new Error(`Error did not match validator: ${error}`);
    }
  }
}

// computeTotalPages: handles zero items
{
  const result = computeTotalPages(0, 10);
  assertEqual(result, 1);
}

// computeTotalPages: handles single page of items
{
  const result = computeTotalPages(5, 10);
  assertEqual(result, 1);
}

// computeTotalPages: handles exactly one page
{
  const result = computeTotalPages(10, 10);
  assertEqual(result, 1);
}

// computeTotalPages: handles multiple pages
{
  const result = computeTotalPages(25, 10);
  assertEqual(result, 3);
}

// computeTotalPages: handles large numbers
{
  const result = computeTotalPages(1000, 20);
  assertEqual(result, 50);
}

// computeTotalPages: rounds up partial pages
{
  const result = computeTotalPages(21, 10);
  assertEqual(result, 3);
}

// computeTotalPages: throws RangeError for zero pageSize
{
  assertThrows(
    () => computeTotalPages(10, 0),
    (error: unknown) => error instanceof RangeError && (error as RangeError).message.includes('pageSize must be > 0'),
  );
}

// computeTotalPages: throws RangeError for negative pageSize
{
  assertThrows(
    () => computeTotalPages(10, -5),
    (error: unknown) => error instanceof RangeError,
  );
}

// getPageSlice: returns first page correctly
{
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = getPageSlice(items, 1, 3);
  assertDeepEqual(result, [1, 2, 3]);
}

// getPageSlice: returns middle page correctly
{
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = getPageSlice(items, 2, 3);
  assertDeepEqual(result, [4, 5, 6]);
}

// getPageSlice: returns last page correctly
{
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = getPageSlice(items, 4, 3);
  assertDeepEqual(result, [10]);
}

// getPageSlice: handles empty array
{
  const items: number[] = [];
  const result = getPageSlice(items, 1, 10);
  assertDeepEqual(result, []);
}

// getPageSlice: returns empty array for out-of-bounds page
{
  const items = [1, 2, 3];
  const result = getPageSlice(items, 10, 3);
  assertDeepEqual(result, []);
}

// getPageSlice: handles page size larger than array
{
  const items = [1, 2, 3];
  const result = getPageSlice(items, 1, 10);
  assertDeepEqual(result, [1, 2, 3]);
}

// getPageSlice: throws RangeError for zero pageSize
{
  const items = [1, 2, 3];
  assertThrows(
    () => getPageSlice(items, 1, 0),
    (error: unknown) => error instanceof RangeError && (error as RangeError).message.includes('pageSize must be > 0'),
  );
}

// getPageSlice: throws RangeError for negative pageSize
{
  const items = [1, 2, 3];
  assertThrows(
    () => getPageSlice(items, 1, -5),
    (error: unknown) => error instanceof RangeError,
  );
}

// getPageSlice: works with different data types
{
  const items = ['a', 'b', 'c', 'd', 'e'];
  const result = getPageSlice(items, 2, 2);
  assertDeepEqual(result, ['c', 'd']);
}

// clampPage: returns page when within bounds
{
  const result = clampPage(5, 10);
  assertEqual(result, 5);
}

// clampPage: clamps page below 1 to 1
{
  const result = clampPage(0, 10);
  assertEqual(result, 1);
}

// clampPage: clamps negative page to 1
{
  const result = clampPage(-5, 10);
  assertEqual(result, 1);
}

// clampPage: clamps page above totalPages to totalPages
{
  const result = clampPage(15, 10);
  assertEqual(result, 10);
}

// clampPage: handles edge case of page 1 with 1 total page
{
  const result = clampPage(1, 1);
  assertEqual(result, 1);
}

// clampPage: handles extremely large page number
{
  const result = clampPage(999999, 10);
  assertEqual(result, 10);
}

// buildPaginationState: builds correct state for first page
{
  const result = buildPaginationState(100, 1, 10);
  assertEqual(result.totalItems, 100);
  assertEqual(result.pageSize, 10);
  assertEqual(result.totalPages, 10);
  assertEqual(result.currentPage, 1);
}

// buildPaginationState: builds correct state for middle page
{
  const result = buildPaginationState(100, 5, 10);
  assertEqual(result.currentPage, 5);
  assertEqual(result.totalPages, 10);
}

// buildPaginationState: clamps out-of-range page to valid range
{
  const result = buildPaginationState(100, 50, 10);
  assertEqual(result.currentPage, 10);
  assertEqual(result.totalPages, 10);
}

// buildPaginationState: clamps negative page to 1
{
  const result = buildPaginationState(100, -1, 10);
  assertEqual(result.currentPage, 1);
}

// buildPaginationState: handles zero items
{
  const result = buildPaginationState(0, 1, 10);
  assertEqual(result.totalItems, 0);
  assertEqual(result.totalPages, 1);
  assertEqual(result.currentPage, 1);
}

// buildPaginationState: handles partial last page
{
  const result = buildPaginationState(25, 3, 10);
  assertEqual(result.totalPages, 3);
  assertEqual(result.currentPage, 3);
}

// buildPaginationState: returns all required fields with correct types
{
  const result = buildPaginationState(50, 2, 10);
  if (typeof result.totalItems !== 'number') throw new Error('totalItems should be number');
  if (typeof result.pageSize !== 'number') throw new Error('pageSize should be number');
  if (typeof result.totalPages !== 'number') throw new Error('totalPages should be number');
  if (typeof result.currentPage !== 'number') throw new Error('currentPage should be number');
  if (Object.keys(result).length !== 4) throw new Error('Should have exactly 4 fields');
}

// Integration: full pagination scenario
{
  const items = Array.from({ length: 47 }, (_, i) => i + 1);
  const pageSize = 10;
  const page = 3;

  const state = buildPaginationState(items.length, page, pageSize);
  const slice = getPageSlice(items, page, pageSize);

  assertEqual(state.totalPages, 5);
  assertEqual(state.currentPage, 3);
  assertDeepEqual(slice, [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
}

console.log('pagination-utils.test.ts: all assertions passed');
