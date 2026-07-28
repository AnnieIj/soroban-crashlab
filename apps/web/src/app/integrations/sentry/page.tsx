import IntegrateSentryIntegrationForCrashReporting from '../../integrate-sentry-integration-for-crash-reporting';
import IntegrationPageSkeleton from '../IntegrationPageSkeleton';
import { Suspense } from 'react';

export const metadata = {
  title: 'Sentry Integration – Integrations | SorobanCrashLab',
  description:
    'Automatically send crash reports and error traces from fuzzing runs to Sentry for centralized monitoring, alerting, and debugging workflows.',
};

export default function SentryIntegrationPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<IntegrationPageSkeleton />}>
        <IntegrateSentryIntegrationForCrashReporting />
      </Suspense>
    </div>
  );
}
