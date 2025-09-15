import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_moderator_contentFlags_moderatorReviews_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.moderator.contentFlags.moderatorReviews.erase(
      connection,
      {
        contentFlagId: typia.random<string & tags.Format<"uuid">>(),
        moderatorReviewId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
