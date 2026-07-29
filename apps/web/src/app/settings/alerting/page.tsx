import BreadcrumbNav from '@/components/BreadcrumbNav';
import AlertingSettingsPage from "../../create-alerting-settings-page-page";

export default function AlertingSettingsRoutePage() {
  return (
    <div className="px-6 md:px-8 max-w-5xl mx-auto w-full py-14">
      <BreadcrumbNav
        segments={[
          { label: 'Settings', href: '/settings' },
          { label: 'Alerting' },
        ]}
      />
      <AlertingSettingsPage />
    </div>
  );
}
