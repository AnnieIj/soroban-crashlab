'use client';

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '../../../components/LoadingSkeleton';

const NotificationPreferencesPage = dynamic(
  () => import('../../notification-preferences'),
  { loading: () => <LoadingSpinner /> },
);

export default function NotificationSettingsRoute() {
  return (
    <div className="px-6 md:px-8 max-w-5xl mx-auto w-full py-14">
      <NotificationPreferencesPage />
    </div>
  );
}
