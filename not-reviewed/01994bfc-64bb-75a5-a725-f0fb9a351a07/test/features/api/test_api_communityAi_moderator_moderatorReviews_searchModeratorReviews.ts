import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiModeratorReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiModeratorReview";
import { ICommunityAiModeratorReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModeratorReview";

export async function test_api_communityAi_moderator_moderatorReviews_searchModeratorReviews(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiModeratorReview =
    await api.functional.communityAi.moderator.moderatorReviews.searchModeratorReviews(
      connection,
      {
        body: typia.random<ICommunityAiModeratorReview.IRequest>(),
      },
    );
  typia.assert(output);
}
