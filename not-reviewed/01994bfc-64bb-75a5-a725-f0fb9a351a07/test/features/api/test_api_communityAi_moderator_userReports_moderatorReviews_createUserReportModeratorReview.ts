import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiModeratorReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModeratorReview";
import { ICommunityAiUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserReport";

export async function test_api_communityAi_moderator_userReports_moderatorReviews_createUserReportModeratorReview(
  connection: api.IConnection,
) {
  const output: ICommunityAiModeratorReview =
    await api.functional.communityAi.moderator.userReports.moderatorReviews.createUserReportModeratorReview(
      connection,
      {
        userReportId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiUserReport.IModeratorReviewICreate>(),
      },
    );
  typia.assert(output);
}
