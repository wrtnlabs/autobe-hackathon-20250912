import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiCommentSentimentAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiCommentSentimentAnalysis";

export async function test_api_communityAi_member_comments_sentimentAnalyses_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiCommentSentimentAnalysis =
    await api.functional.communityAi.member.comments.sentimentAnalyses.update(
      connection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiCommentSentimentAnalysis.IUpdate>(),
      },
    );
  typia.assert(output);
}
