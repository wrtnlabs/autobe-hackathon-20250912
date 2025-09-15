import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_moderator_comments_sentimentAnalyses_eraseSentimentAnalysis(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.moderator.comments.sentimentAnalyses.eraseSentimentAnalysis(
      connection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
