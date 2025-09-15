import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageICommunityAiModeratorReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiModeratorReview";
import { ICommunityAiModeratorReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModeratorReview";

export async function test_api_communityAi_moderator_userReports_moderatorReviews_indexModeratorReviewsByUserReport(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiModeratorReview =
    await api.functional.communityAi.moderator.userReports.moderatorReviews.indexModeratorReviewsByUserReport(
      connection,
      {
        userReportId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiModeratorReview.IRequest>(),
      },
    );
  typia.assert(output);
}
