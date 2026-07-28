import IntegrateGrafanaDashboardAnnotationApi from '../../integrate-grafana-dashboard-annotation-api';
import IntegrationPageSkeleton from '../IntegrationPageSkeleton';
import { Suspense } from 'react';

export const metadata = {
  title: 'Grafana Annotations – Integrations | SorobanCrashLab',
  description:
    'Post fuzzing run lifecycle events to your Grafana dashboards via the Annotations API. Mark starts, failures, and completions as timeline annotations.',
};

export default function GrafanaIntegrationPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<IntegrationPageSkeleton />}>
        <IntegrateGrafanaDashboardAnnotationApi />
      </Suspense>
    </div>
  );
}
