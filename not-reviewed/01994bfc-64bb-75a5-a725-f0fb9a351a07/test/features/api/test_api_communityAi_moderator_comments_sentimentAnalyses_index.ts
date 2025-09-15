import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageICommunityAiCommentSentimentAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiCommentSentimentAnalysis";
import { ICommunityAiCommentSentimentAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiCommentSentimentAnalysis";

export async function test_api_communityAi_moderator_comments_sentimentAnalyses_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiCommentSentimentAnalysis =
    await api.functional.communityAi.moderator.comments.sentimentAnalyses.index(
      connection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiCommentSentimentAnalysis.IRequest>(),
      },
    );
  typia.assert(output);
}
