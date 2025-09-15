import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAiGeneratedReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiGeneratedReplies";

export async function test_api_communityAi_moderator_aiCommenting_aiGeneratedReplies_atAiGeneratedReplies(
  connection: api.IConnection,
) {
  const output: ICommunityAiAiGeneratedReplies =
    await api.functional.communityAi.moderator.aiCommenting.aiGeneratedReplies.atAiGeneratedReplies(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
