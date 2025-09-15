import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiAiGeneratedReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiAiGeneratedReplies";
import { ICommunityAiAiGeneratedReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiGeneratedReplies";

export async function test_api_communityAi_member_aiCommenting_aiGeneratedReplies_indexAiGeneratedReplies(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiAiGeneratedReplies =
    await api.functional.communityAi.member.aiCommenting.aiGeneratedReplies.indexAiGeneratedReplies(
      connection,
      {
        body: typia.random<ICommunityAiAiGeneratedReplies.IRequest>(),
      },
    );
  typia.assert(output);
}
