import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageICommunityAiModeratorReviews } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiModeratorReviews";
import { ICommunityAiContentFlags } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiContentFlags";

export async function test_api_communityAi_moderator_contentFlags_moderatorReviews_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiModeratorReviews.ISummary =
    await api.functional.communityAi.moderator.contentFlags.moderatorReviews.index(
      connection,
      {
        contentFlagId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiContentFlags.IModeratorReviewsRequest>(),
      },
    );
  typia.assert(output);
}
