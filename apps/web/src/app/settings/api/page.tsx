'use client';

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '../../../components/LoadingSkeleton';

const ApiConfigForm = dynamic(
  () => import('../../../components/ApiConfigForm'),
  { loading: () => <LoadingSpinner /> },
);

export default function ApiSettingsPage() {
  return (
    <div className="px-6 md:px-8 max-w-5xl mx-auto w-full py-14">
      <ApiConfigForm />
    </div>
  );
}
