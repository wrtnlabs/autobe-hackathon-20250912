import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiModeratorReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModeratorReview";

export async function test_api_communityAi_moderator_moderatorReviews_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiModeratorReview =
    await api.functional.communityAi.moderator.moderatorReviews.create(
      connection,
      {
        body: typia.random<ICommunityAiModeratorReview.ICreate>(),
      },
    );
  typia.assert(output);
}
