import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiModeratorReviews } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModeratorReviews";

export async function test_api_communityAi_moderator_contentFlags_moderatorReviews_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiModeratorReviews =
    await api.functional.communityAi.moderator.contentFlags.moderatorReviews.create(
      connection,
      {
        contentFlagId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiModeratorReviews.ICreate>(),
      },
    );
  typia.assert(output);
}
