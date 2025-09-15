import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiModeratorReviews } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModeratorReviews";

export async function test_api_communityAi_moderator_contentFlags_moderatorReviews_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiModeratorReviews =
    await api.functional.communityAi.moderator.contentFlags.moderatorReviews.at(
      connection,
      {
        contentFlagId: typia.random<string & tags.Format<"uuid">>(),
        moderatorReviewId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
