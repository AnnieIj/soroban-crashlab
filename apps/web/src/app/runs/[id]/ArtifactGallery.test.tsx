/**
 * Unit tests for ArtifactGallery component.
 * Issue #1350 & #1349: Handle runs with zero artifacts gracefully.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ArtifactGallery from "./ArtifactGallery";
import type { FuzzingRun } from "../../types";

const mockRunWithArtifacts: FuzzingRun = {
  id: "run-123",
  status: "success",
  queuedAt: "2026-01-01T00:00:00Z",
  cpuInstructions: 500_000,
  memoryBytes: 5_000_000,
  minResourceFee: 2000,
  artifacts: [
    { id: "art-1", name: "crash.bin", type: "crash", size: 1024 * 100 },
    { id: "art-2", name: "seed.dat", type: "seed", size: 1024 * 50 },
  ],
};

const mockRunWithZeroArtifacts: FuzzingRun = {
  id: "run-456",
  status: "failed",
  queuedAt: "2026-01-01T00:00:00Z",
  cpuInstructions: 100_000,
  memoryBytes: 1_000_000,
  minResourceFee: 500,
  artifacts: [],
};

const mockRunWithUndefinedArtifacts: FuzzingRun = {
  id: "run-789",
  status: "failed",
  queuedAt: "2026-01-01T00:00:00Z",
  cpuInstructions: 100_000,
  memoryBytes: 1_000_000,
  minResourceFee: 500,
};

describe("ArtifactGallery", () => {
  it("should render empty state when artifacts array is empty", () => {
    render(<ArtifactGallery run={mockRunWithZeroArtifacts} />);

    expect(
      screen.getByText("No artifacts were produced by this run"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/run may have failed before generating any artifacts/i),
    ).toBeInTheDocument();
  });

  it("should render empty state when artifacts field is undefined", () => {
    render(<ArtifactGallery run={mockRunWithUndefinedArtifacts} />);

    expect(
      screen.getByText("No artifacts were produced by this run"),
    ).toBeInTheDocument();
  });

  it("should render artifact list when artifacts exist", () => {
    render(<ArtifactGallery run={mockRunWithArtifacts} />);

    expect(screen.getByText("Artifacts (2)")).toBeInTheDocument();
    expect(screen.getByText("crash.bin")).toBeInTheDocument();
    expect(screen.getByText("seed.dat")).toBeInTheDocument();
    expect(screen.getByText("100.0 KB")).toBeInTheDocument();
    expect(screen.getByText("50.0 KB")).toBeInTheDocument();
  });

  it("should not crash when rendering with zero artifacts", () => {
    expect(() => {
      render(<ArtifactGallery run={mockRunWithZeroArtifacts} />);
    }).not.toThrow();
  });

  it("should hide download and action buttons when no artifacts", () => {
    const { container } = render(
      <ArtifactGallery run={mockRunWithZeroArtifacts} />,
    );

    // Ensure no artifact-specific action buttons are rendered
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(0);
  });
});
