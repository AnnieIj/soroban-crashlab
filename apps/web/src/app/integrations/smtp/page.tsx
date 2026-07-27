import IntegrateSmtpEmailIntegration from '../../integrate-smtp-email-integration';
import IntegrationPageSkeleton from '../IntegrationPageSkeleton';
import { Suspense } from 'react';

export const metadata = {
  title: 'SMTP Email – Integrations | SorobanCrashLab',
  description:
    'Send critical event notifications and run status updates over a standard SMTP connection.',
};

export default function SmtpIntegrationPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<IntegrationPageSkeleton />}>
        <IntegrateSmtpEmailIntegration />
      </Suspense>
    </div>
  );
}
