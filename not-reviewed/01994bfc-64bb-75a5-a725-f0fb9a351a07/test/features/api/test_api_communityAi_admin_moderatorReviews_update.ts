import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiModeratorReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModeratorReview";

export async function test_api_communityAi_admin_moderatorReviews_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiModeratorReview =
    await api.functional.communityAi.admin.moderatorReviews.update(connection, {
      moderatorReviewId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiModeratorReview.IUpdate>(),
    });
  typia.assert(output);
}
