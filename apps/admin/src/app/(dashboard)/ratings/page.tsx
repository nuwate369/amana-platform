import RatingsClient from './RatingsClient';
import { listRatingQuestions, listRecentRatings, getRatingsOverview } from '@/app/actions/ratings';

/**
 * صفحة التقييمات — تقرير مؤشرات + إدارة أسئلة التقييم + آخر التقييمات الواردة.
 * مكوّن خادمي يغذّي العميل بالبيانات الأولية.
 */
export default async function RatingsPage() {
  const [{ questions, migrationNeeded }, ratings, overview] = await Promise.all([
    listRatingQuestions(),
    listRecentRatings(),
    getRatingsOverview(),
  ]);
  return (
    <RatingsClient
      initialQuestions={questions}
      initialRatings={ratings}
      overview={overview}
      migrationNeeded={migrationNeeded}
    />
  );
}
