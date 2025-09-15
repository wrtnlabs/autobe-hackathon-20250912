import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiModeratorReviews } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModeratorReviews";

export async function test_api_communityAi_admin_contentFlags_moderatorReviews_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiModeratorReviews =
    await api.functional.communityAi.admin.contentFlags.moderatorReviews.update(
      connection,
      {
        contentFlagId: typia.random<string & tags.Format<"uuid">>(),
        moderatorReviewId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiModeratorReviews.IUpdate>(),
      },
    );
  typia.assert(output);
}
