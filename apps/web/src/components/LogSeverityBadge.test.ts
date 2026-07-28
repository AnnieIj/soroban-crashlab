import assert from 'node:assert';
import { getSeverityStyleClasses } from './LogSeverityBadge';

function testLogSeverityBadge() {
  const errorStyles = getSeverityStyleClasses('error');
  assert(errorStyles.bg.includes('rose'));
  assert(errorStyles.text.includes('rose'));

  const warnStyles = getSeverityStyleClasses('warn');
  assert(warnStyles.bg.includes('amber'));
  assert(warnStyles.text.includes('amber'));

  const infoStyles = getSeverityStyleClasses('info');
  assert(infoStyles.bg.includes('sky'));

  const debugStyles = getSeverityStyleClasses('debug');
  assert(debugStyles.bg.includes('zinc'));
}

testLogSeverityBadge();
console.log('LogSeverityBadge.test.ts: all assertions passed');
