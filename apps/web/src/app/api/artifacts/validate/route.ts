/**
 * API Route: /api/artifacts/validate
 * 
 * Validates artifact metadata and content before storage.
 * Ensures artifacts meet size limits, have valid structure,
 * and safe file paths.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateArtifactMetadata,
  validateArtifactSize,
  isSafeArtifactPath,
  type ArtifactMetadata,
} from '../../../utils/artifact-fs-adapter';

export interface ValidateArtifactRequest {
  metadata: ArtifactMetadata;
  contentSize?: number;
}

export interface ValidateArtifactResponse {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

const MAX_ARTIFACT_SIZE = 10_485_760; // 10MB
const WARNING_SIZE = 5_242_880; // 5MB

export async function POST(request: NextRequest): Promise<NextResponse<ValidateArtifactResponse>> {
  try {
    const body = await request.json() as ValidateArtifactRequest;

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          valid: false,
          errors: ['Request body must be a JSON object'],
        },
        { status: 400 }
      );
    }

    const { metadata, contentSize } = body;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate metadata structure
    if (!metadata) {
      errors.push('metadata is required');
    } else {
      const metadataValidation = validateArtifactMetadata(metadata);
      if (!metadataValidation.valid) {
        errors.push(...metadataValidation.errors);
      }

      // Validate path safety
      if (metadata.path && !isSafeArtifactPath(metadata.path)) {
        errors.push('Artifact path is unsafe or invalid');
      }

      // Validate size
      if (metadata.size !== undefined) {
        if (!validateArtifactSize(metadata.size, MAX_ARTIFACT_SIZE)) {
          errors.push(`Artifact size ${metadata.size} exceeds maximum ${MAX_ARTIFACT_SIZE} bytes`);
        } else if (metadata.size > WARNING_SIZE) {
          warnings.push(`Artifact size ${metadata.size} is large (>${WARNING_SIZE} bytes)`);
        }
      }

      // If contentSize provided, validate it matches metadata.size
      if (contentSize !== undefined && metadata.size !== undefined) {
        if (contentSize !== metadata.size) {
          errors.push(`Content size ${contentSize} does not match metadata size ${metadata.size}`);
        }
      }
    }

    const valid = errors.length === 0;

    return NextResponse.json(
      {
        valid,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
      { status: valid ? 200 : 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        errors: [
          error instanceof Error 
            ? `Validation error: ${error.message}` 
            : 'Unknown validation error'
        ],
      },
      { status: 500 }
    );
  }
}

// Support GET for health checks
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/artifacts/validate',
    method: 'POST',
    description: 'Validates artifact metadata and content',
  });
}
