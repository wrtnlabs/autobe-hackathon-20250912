import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAiGeneratedReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiGeneratedReplies";

export async function test_api_communityAi_member_aiCommenting_aiGeneratedReplies_updateAiGeneratedReply(
  connection: api.IConnection,
) {
  const output: ICommunityAiAiGeneratedReplies =
    await api.functional.communityAi.member.aiCommenting.aiGeneratedReplies.updateAiGeneratedReply(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiAiGeneratedReplies.IUpdate>(),
      },
    );
  typia.assert(output);
}
