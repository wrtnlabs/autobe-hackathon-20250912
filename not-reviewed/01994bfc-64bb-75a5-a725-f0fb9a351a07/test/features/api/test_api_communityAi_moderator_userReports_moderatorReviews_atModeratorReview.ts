import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiModeratorReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModeratorReview";

export async function test_api_communityAi_moderator_userReports_moderatorReviews_atModeratorReview(
  connection: api.IConnection,
) {
  const output: ICommunityAiModeratorReview =
    await api.functional.communityAi.moderator.userReports.moderatorReviews.atModeratorReview(
      connection,
      {
        userReportId: typia.random<string & tags.Format<"uuid">>(),
        moderatorReviewId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
