import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAiCommentSuggestions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiCommentSuggestions";

export async function test_api_communityAi_moderator_aiCommenting_aiCommentSuggestions_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiAiCommentSuggestions =
    await api.functional.communityAi.moderator.aiCommenting.aiCommentSuggestions.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiAiCommentSuggestions.IUpdate>(),
      },
    );
  typia.assert(output);
}
