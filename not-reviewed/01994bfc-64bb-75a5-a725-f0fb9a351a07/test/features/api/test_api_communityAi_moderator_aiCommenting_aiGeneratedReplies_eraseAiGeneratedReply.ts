import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_moderator_aiCommenting_aiGeneratedReplies_eraseAiGeneratedReply(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.moderator.aiCommenting.aiGeneratedReplies.eraseAiGeneratedReply(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
