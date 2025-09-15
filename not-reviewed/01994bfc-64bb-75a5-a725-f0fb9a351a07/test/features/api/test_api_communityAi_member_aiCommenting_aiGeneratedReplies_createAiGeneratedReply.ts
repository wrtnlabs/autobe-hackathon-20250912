import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiAiGeneratedReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiGeneratedReplies";

export async function test_api_communityAi_member_aiCommenting_aiGeneratedReplies_createAiGeneratedReply(
  connection: api.IConnection,
) {
  const output: ICommunityAiAiGeneratedReplies =
    await api.functional.communityAi.member.aiCommenting.aiGeneratedReplies.createAiGeneratedReply(
      connection,
      {
        body: typia.random<ICommunityAiAiGeneratedReplies.ICreate>(),
      },
    );
  typia.assert(output);
}
