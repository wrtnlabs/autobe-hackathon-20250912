import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiCommentSentimentAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiCommentSentimentAnalysis";

export async function test_api_communityAi_admin_comments_sentimentAnalyses_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiCommentSentimentAnalysis =
    await api.functional.communityAi.admin.comments.sentimentAnalyses.at(
      connection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
