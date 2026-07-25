import type { FuzzingRun, LedgerStateChange } from '../types';
import { collectRunArtifacts } from './artifact-collection';

function makeTextFile(name: string, content: string): string {
  return `--boundary\r\nContent-Type: application/json\r\nContent-Disposition: attachment; name="${name}"\r\n\r\n${content}\r\n`;
}

function makeManifest(runId: string, files: { name: string; size: number }[]): string {
  return JSON.stringify({
    version: '1.0',
    generatedAt: new Date().toISOString(),
    runId,
    files,
  }, null, 2);
}

export async function generateRunArtifactZip(
  run: FuzzingRun,
  ledgerChanges?: LedgerStateChange[]
): Promise<Blob> {
  const artifacts = collectRunArtifacts(run, ledgerChanges);

  const metadataJson = JSON.stringify(artifacts.metadata, null, 2);
  const tracesJson = JSON.stringify(artifacts.traces, null, 2);
  const fixturesJson = JSON.stringify(artifacts.fixtures, null, 2);

  const manifest = makeManifest(run.id, [
    { name: 'metadata.json', size: metadataJson.length },
    { name: 'traces.json', size: tracesJson.length },
    { name: 'fixtures.json', size: fixturesJson.length },
  ]);

  const parts = [
    makeTextFile('metadata.json', metadataJson),
    makeTextFile('traces.json', tracesJson),
    makeTextFile('fixtures.json', fixturesJson),
    makeTextFile('manifest.json', manifest),
    '--boundary--',
  ];

  return new Blob(parts, { type: 'application/octet-stream' });
}
