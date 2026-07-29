import BreadcrumbNav from '@/components/BreadcrumbNav';
import AlertingPresetsPage from '../../../create-alerting-presets-page';

export default function AlertingPresetsRoutePage() {
  return (
    <div className="px-6 md:px-8 max-w-5xl mx-auto w-full py-14">
      <BreadcrumbNav
        segments={[
          { label: 'Settings', href: '/settings' },
          { label: 'Alerting', href: '/settings/alerting' },
          { label: 'Presets' },
        ]}
      />
      <AlertingPresetsPage />
    </div>
  );
}
