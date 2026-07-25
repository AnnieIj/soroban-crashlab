import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { WebhookStore, resetWebhookStore } from '../lib/webhook-store';
import { WebhookDeliveryWorker, WebhookDeliveryRequest } from '../lib/webhook-delivery-worker';

const TEST_DATA_DIR = path.join(__dirname, '__test-webhook-data__');

function cleanup() {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
}

function makeRequest(id: string): WebhookDeliveryRequest {
  return {
    id,
    url: 'https://example.com/deliver',
    eventType: 'run.completed',
    payload: { runId: id },
  };
}

// ─── WebhookStore: config persistence ──────────────────────────────────

cleanup();
resetWebhookStore();

{
  const dir = path.join(TEST_DATA_DIR, 'configs1');
  const store1 = new WebhookStore(dir);
  store1.setConfig({
    id: 'wh-1',
    url: 'https://example.com/hook',
    events: ['run.completed'],
    active: true,
  });

  const store2 = new WebhookStore(dir);
  const cfg = store2.getConfig('wh-1');
  assert.ok(cfg, 'config should exist');
  assert.strictEqual(cfg.url, 'https://example.com/hook');
  console.log('PASS: persists configs across instances');
}

{
  const dir = path.join(TEST_DATA_DIR, 'configs2');
  const store1 = new WebhookStore(dir);
  store1.setConfig({
    id: 'wh-1',
    url: 'https://example.com/hook',
    events: ['run.completed'],
    active: true,
  });
  store1.deleteConfig('wh-1');

  const store2 = new WebhookStore(dir);
  assert.strictEqual(store2.getConfig('wh-1'), undefined);
  assert.strictEqual(store2.getAllConfigs().length, 0);
  console.log('PASS: persists config deletion');
}

{
  const dir = path.join(TEST_DATA_DIR, 'configs3');
  const store = new WebhookStore(dir);
  store.setConfig({ id: 'a', url: 'https://a.com', events: ['run.started'], active: true });
  store.setConfig({ id: 'b', url: 'https://b.com', events: ['run.failed'], active: false });

  assert.strictEqual(store.getAllConfigs().length, 2);
  console.log('PASS: returns all configs');
}

// ─── WebhookStore: queue persistence ───────────────────────────────────

{
  const dir = path.join(TEST_DATA_DIR, 'queue1');
  const store1 = new WebhookStore(dir);
  store1.enqueue(makeRequest('req-1'));
  store1.enqueue(makeRequest('req-2'));

  const store2 = new WebhookStore(dir);
  assert.strictEqual(store2.queueSize(), 2);
  assert.strictEqual(store2.getQueue()[0].id, 'req-1');
  console.log('PASS: persists queue across instances');
}

{
  const dir = path.join(TEST_DATA_DIR, 'queue2');
  const store1 = new WebhookStore(dir);
  store1.enqueue(makeRequest('req-1'));
  store1.enqueue(makeRequest('req-2'));
  store1.dequeue();

  const store2 = new WebhookStore(dir);
  assert.strictEqual(store2.queueSize(), 1);
  assert.strictEqual(store2.getQueue()[0].id, 'req-2');
  console.log('PASS: persists dequeue');
}

{
  const dir = path.join(TEST_DATA_DIR, 'queue3');
  const store1 = new WebhookStore(dir);
  store1.enqueue(makeRequest('req-1'));
  store1.enqueue(makeRequest('req-2'));
  store1.removeFromQueue('req-1');

  const store2 = new WebhookStore(dir);
  assert.strictEqual(store2.queueSize(), 1);
  assert.strictEqual(store2.getQueue()[0].id, 'req-2');
  console.log('PASS: persists removeFromQueue');
}

{
  const dir = path.join(TEST_DATA_DIR, 'queue4');
  const store1 = new WebhookStore(dir);
  store1.enqueue(makeRequest('req-1'));
  store1.enqueue(makeRequest('req-2'));
  store1.clearQueue();

  const store2 = new WebhookStore(dir);
  assert.strictEqual(store2.queueSize(), 0);
  console.log('PASS: persists clearQueue');
}

// ─── WebhookStore: delivery log persistence ────────────────────────────

{
  const dir = path.join(TEST_DATA_DIR, 'log1');
  const store1 = new WebhookStore(dir);
  store1.addDeliveryLog({
    webhookId: 'wh-1',
    success: true,
    statusCode: 200,
    retryCount: 0,
    timestamp: new Date().toISOString(),
  });

  const store2 = new WebhookStore(dir);
  const log = store2.getDeliveryLog();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].webhookId, 'wh-1');
  console.log('PASS: persists delivery log across instances');
}

{
  const dir = path.join(TEST_DATA_DIR, 'log2');
  const store = new WebhookStore(dir);
  store.addDeliveryLog({ webhookId: 'wh-1', success: true, retryCount: 0, timestamp: '' });
  store.addDeliveryLog({ webhookId: 'wh-2', success: false, retryCount: 1, timestamp: '' });

  assert.strictEqual(store.getDeliveryLog('wh-1').length, 1);
  assert.strictEqual(store.getDeliveryLog('wh-2').length, 1);
  console.log('PASS: filters delivery log by webhook ID');
}

{
  const dir = path.join(TEST_DATA_DIR, 'log3');
  const store1 = new WebhookStore(dir);
  store1.addDeliveryLog({ webhookId: 'wh-1', success: true, retryCount: 0, timestamp: '' });
  store1.clearDeliveryLog();

  const store2 = new WebhookStore(dir);
  assert.strictEqual(store2.getDeliveryLog().length, 0);
  console.log('PASS: persists clearDeliveryLog');
}

// ─── WebhookDeliveryWorker: restart recovery (sync) ────────────────────

{
  const dir = path.join(TEST_DATA_DIR, 'recover1');
  const store = new WebhookStore(dir);
  store.enqueue(makeRequest('req-1'));
  store.enqueue(makeRequest('req-2'));

  const worker = new WebhookDeliveryWorker({ store });
  assert.strictEqual(worker.size(), 0);

  worker.recoverPendingDeliveries();
  assert.strictEqual(worker.size(), 2);
  console.log('PASS: recovers pending deliveries from the store');
}

{
  const dir = path.join(TEST_DATA_DIR, 'recover2');
  const store = new WebhookStore(dir);
  store.enqueue(makeRequest('req-1'));

  const worker = new WebhookDeliveryWorker({ store });
  worker.recoverPendingDeliveries();
  worker.recoverPendingDeliveries();
  assert.strictEqual(worker.size(), 1);
  console.log('PASS: does not duplicate already-recovered items');
}

{
  const worker = new WebhookDeliveryWorker();
  worker.enqueue(makeRequest('req-1'));
  assert.strictEqual(worker.size(), 1);
  worker.start();
  worker.stop();
  console.log('PASS: works without a store (backward compatible)');
}

// ─── WebhookDeliveryWorker: restart recovery (async) ───────────────────

void (async () => {
  {
    const dir = path.join(TEST_DATA_DIR, 'recover3');
    const store = new WebhookStore(dir);
    store.enqueue(makeRequest('req-1'));

    let delivered = false;
    const worker = new WebhookDeliveryWorker({
      store,
      adapter: {
        deliver: async () => {
          delivered = true;
          return { ok: true, statusCode: 200 };
        },
      },
      delay: async () => {},
    });

    worker.start();
    await worker.drain();
    worker.stop();

    assert.strictEqual(delivered, true);
    assert.strictEqual(store.queueSize(), 0);
    assert.strictEqual(store.getDeliveryLog().length, 1);
    console.log('PASS: removes items from persistent store after processing');
  }

  {
    const dir = path.join(TEST_DATA_DIR, 'recover4');
    const store = new WebhookStore(dir);
    store.enqueue(makeRequest('req-1'));
    store.enqueue(makeRequest('req-2'));
    store.enqueue(makeRequest('req-3'));

    // Simulate: req-1 was already processed before the "crash"
    store.removeFromQueue('req-1');

    // New worker instance (simulates restart)
    const worker = new WebhookDeliveryWorker({ store });
    worker.recoverPendingDeliveries();
    assert.strictEqual(worker.size(), 2);
    assert.strictEqual(store.getQueue()[0].id, 'req-2');
    assert.strictEqual(store.getQueue()[1].id, 'req-3');
    console.log('PASS: survives simulated restart with partial queue');
  }

  cleanup();
  resetWebhookStore();
  console.log('ALL webhook-store tests passed');
})();
