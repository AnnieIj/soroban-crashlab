/**
 * Artifact File System Adapter
 * 
 * Provides utilities for reading, writing, and managing fuzzing artifacts
 * on the file system, including crash payloads, seed files, and execution traces.
 */

export interface ArtifactMetadata {
  id: string;
  runId: string;
  type: 'crash' | 'seed' | 'trace' | 'coverage';
  size: number;
  timestamp: number;
  path: string;
}

export interface ArtifactContent {
  metadata: ArtifactMetadata;
  data: string | Buffer;
}

export interface ArtifactValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate artifact metadata structure
 */
export function validateArtifactMetadata(metadata: unknown): ArtifactValidationResult {
  const errors: string[] = [];

  if (typeof metadata !== 'object' || metadata === null) {
    errors.push('Metadata must be an object');
    return { valid: false, errors };
  }

  const m = metadata as Partial<ArtifactMetadata>;

  if (!m.id || typeof m.id !== 'string') {
    errors.push('id must be a non-empty string');
  }

  if (!m.runId || typeof m.runId !== 'string') {
    errors.push('runId must be a non-empty string');
  }

  if (!m.type || !['crash', 'seed', 'trace', 'coverage'].includes(m.type as string)) {
    errors.push('type must be one of: crash, seed, trace, coverage');
  }

  if (typeof m.size !== 'number' || m.size < 0) {
    errors.push('size must be a non-negative number');
  }

  if (typeof m.timestamp !== 'number' || m.timestamp < 0) {
    errors.push('timestamp must be a non-negative number');
  }

  if (!m.path || typeof m.path !== 'string') {
    errors.push('path must be a non-empty string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate artifact ID from run ID and type
 */
export function generateArtifactId(runId: string, type: string, index: number = 0): string {
  const timestamp = Date.now();
  return `artifact-${runId}-${type}-${index}-${timestamp}`;
}

/**
 * Parse artifact ID to extract components
 */
export function parseArtifactId(artifactId: string): {
  runId: string | null;
  type: string | null;
  index: number | null;
  timestamp: number | null;
} {
  const parts = artifactId.split('-');
  
  if (parts.length < 5 || parts[0] !== 'artifact') {
    return { runId: null, type: null, index: null, timestamp: null };
  }

  return {
    runId: parts[1],
    type: parts[2],
    index: parseInt(parts[3], 10),
    timestamp: parseInt(parts[4], 10),
  };
}

/**
 * Get artifact file extension based on type
 */
export function getArtifactExtension(type: string): string {
  switch (type) {
    case 'crash':
      return '.crash.json';
    case 'seed':
      return '.seed.bin';
    case 'trace':
      return '.trace.log';
    case 'coverage':
      return '.coverage.json';
    default:
      return '.artifact';
  }
}

/**
 * Build artifact file path
 */
export function buildArtifactPath(runId: string, artifactId: string, type: string): string {
  const extension = getArtifactExtension(type);
  return `artifacts/${runId}/${artifactId}${extension}`;
}

/**
 * Validate artifact content size
 */
export function validateArtifactSize(size: number, maxSize: number = 10_485_760): boolean {
  return size >= 0 && size <= maxSize;
}

/**
 * Filter artifacts by type
 */
export function filterArtifactsByType(
  artifacts: ArtifactMetadata[],
  type: ArtifactMetadata['type']
): ArtifactMetadata[] {
  return artifacts.filter(a => a.type === type);
}

/**
 * Sort artifacts by timestamp (newest first)
 */
export function sortArtifactsByTime(artifacts: ArtifactMetadata[]): ArtifactMetadata[] {
  return [...artifacts].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Group artifacts by run ID
 */
export function groupArtifactsByRun(
  artifacts: ArtifactMetadata[]
): Map<string, ArtifactMetadata[]> {
  const groups = new Map<string, ArtifactMetadata[]>();
  
  for (const artifact of artifacts) {
    const existing = groups.get(artifact.runId) ?? [];
    groups.set(artifact.runId, [...existing, artifact]);
  }
  
  return groups;
}

/**
 * Calculate total size of artifacts
 */
export function calculateTotalSize(artifacts: ArtifactMetadata[]): number {
  return artifacts.reduce((sum, artifact) => sum + artifact.size, 0);
}

/**
 * Find artifact by ID
 */
export function findArtifactById(
  artifacts: ArtifactMetadata[],
  id: string
): ArtifactMetadata | null {
  return artifacts.find(a => a.id === id) ?? null;
}

/**
 * Check if artifact path is safe (prevents path traversal)
 */
export function isSafeArtifactPath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/');
  
  // Check for path traversal attempts
  if (normalized.includes('../') || normalized.includes('..\\')) {
    return false;
  }
  
  // Check for absolute paths
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    return false;
  }
  
  // Must start with artifacts/
  if (!normalized.startsWith('artifacts/')) {
    return false;
  }
  
  return true;
}
