/**
 * Utilities for regression suite runner with pass/fail visualization
 */

export type RegressionTestStatus = "pass" | "fail" | "skip" | "running";

export interface RegressionTest {
  id: string;
  name: string;
  description: string;
  category: string;
  status: RegressionTestStatus;
  duration?: number;
  errorMessage?: string;
  timestamp: string;
}

export interface RegressionSuite {
  id: string;
  name: string;
  tests: RegressionTest[];
  startedAt: string;
  finishedAt?: string;
  totalDuration: number;
}

export function calculateSuiteStats(suite: RegressionSuite) {
  const total = suite.tests.length;
  const passed = suite.tests.filter((t) => t.status === "pass").length;
  const failed = suite.tests.filter((t) => t.status === "fail").length;
  const skipped = suite.tests.filter((t) => t.status === "skip").length;
  const running = suite.tests.filter((t) => t.status === "running").length;
  const passRate = total > 0 ? (passed / total) * 100 : 0;

  return { total, passed, failed, skipped, running, passRate };
}

export function generateRegressionSuite(
  suiteId: string,
  suiteName: string,
): RegressionSuite {
  const tests: RegressionTest[] = [
    {
      id: "test-1",
      name: "Token Transfer Basic",
      description: "Validates basic token transfer functionality",
      category: "token",
      status: "pass",
      duration: 1250,
      timestamp: new Date().toISOString(),
    },
    {
      id: "test-2",
      name: "Token Transfer Overflow",
      description: "Tests overflow protection in token transfers",
      category: "token",
      status: "pass",
      duration: 1340,
      timestamp: new Date().toISOString(),
    },
    {
      id: "test-3",
      name: "Vault Rebalance with Insufficient Funds",
      description: "Verifies vault rebalance behavior with low balance",
      category: "vault",
      status: "fail",
      duration: 2100,
      errorMessage: "AssertionError: Expected balance > 0, got -10",
      timestamp: new Date().toISOString(),
    },
    {
      id: "test-4",
      name: "Router Swap Price Impact",
      description: "Checks price impact calculations during swaps",
      category: "router",
      status: "pass",
      duration: 1890,
      timestamp: new Date().toISOString(),
    },
    {
      id: "test-5",
      name: "Auth Signature Validation",
      description: "Tests signature validation in auth module",
      category: "auth",
      status: "fail",
      duration: 980,
      errorMessage: "InvalidSignature: Could not verify Ed25519 signature",
      timestamp: new Date().toISOString(),
    },
    {
      id: "test-6",
      name: "State Persistence Check",
      description: "Validates state persistence across runs",
      category: "state",
      status: "pass",
      duration: 2450,
      timestamp: new Date().toISOString(),
    },
    {
      id: "test-7",
      name: "Budget CPU Limit",
      description: "Tests CPU instruction budget enforcement",
      category: "budget",
      status: "pass",
      duration: 1560,
      timestamp: new Date().toISOString(),
    },
    {
      id: "test-8",
      name: "XDR Deserialization Edge Cases",
      description: "Tests XDR parsing with malformed inputs",
      category: "xdr",
      status: "skip",
      timestamp: new Date().toISOString(),
    },
    {
      id: "test-9",
      name: "Liquidity Pool Drain Protection",
      description: "Verifies protection against pool drainage attacks",
      category: "router",
      status: "pass",
      duration: 3200,
      timestamp: new Date().toISOString(),
    },
    {
      id: "test-10",
      name: "Multi-sig Threshold Enforcement",
      description: "Tests multi-signature threshold requirements",
      category: "auth",
      status: "fail",
      duration: 1120,
      errorMessage: "ThresholdError: Required 3 signatures, got 2",
      timestamp: new Date().toISOString(),
    },
  ];

  const startedAt = new Date(Date.now() - 30000).toISOString();
  const finishedAt = new Date().toISOString();
  const totalDuration = tests.reduce((sum, t) => sum + (t.duration || 0), 0);

  return {
    id: suiteId,
    name: suiteName,
    tests,
    startedAt,
    finishedAt,
    totalDuration,
  };
}

export function groupTestsByCategory(
  tests: RegressionTest[],
): Record<string, RegressionTest[]> {
  return tests.reduce(
    (acc, test) => {
      if (!acc[test.category]) {
        acc[test.category] = [];
      }
      acc[test.category].push(test);
      return acc;
    },
    {} as Record<string, RegressionTest[]>,
  );
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
}
