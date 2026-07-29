'use client';

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '../../../components/LoadingSkeleton';

const AddAccessibleKeyboardNavBlueprintPage49 = dynamic(
  () => import('../../add-accessible-keyboard-nav-blueprint-page-49'),
  { loading: () => <LoadingSpinner /> },
);

export default function AccessibilitySettingsPage() {
  return (
    <div className="px-6 md:px-8 max-w-5xl mx-auto w-full py-14">
      <AddAccessibleKeyboardNavBlueprintPage49 />
    </div>
  );
}
