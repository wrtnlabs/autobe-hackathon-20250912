import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiAiCommentSuggestions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiCommentSuggestions";

export async function test_api_communityAi_member_aiCommenting_aiCommentSuggestions_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiAiCommentSuggestions =
    await api.functional.communityAi.member.aiCommenting.aiCommentSuggestions.create(
      connection,
      {
        body: typia.random<ICommunityAiAiCommentSuggestions.ICreate>(),
      },
    );
  typia.assert(output);
}
