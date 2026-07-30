'use client';

import dynamic from 'next/dynamic';
import { mockMilestoneEvents } from '../campaign-milestone-mock-data';
import { LoadingSpinner } from '../../components/LoadingSkeleton';

const CampaignMilestoneTimelineVisualizer = dynamic(
  () => import('../add-campaign-milestone-timeline-visualizer'),
  {
    ssr: false,
    loading: () => <LoadingSpinner />,
  },
);

export default function CampaignMilestoneTimelinePage() {
  return (
    <div className="container mx-auto p-4">
      <CampaignMilestoneTimelineVisualizer events={mockMilestoneEvents} />
    </div>
  );
}
