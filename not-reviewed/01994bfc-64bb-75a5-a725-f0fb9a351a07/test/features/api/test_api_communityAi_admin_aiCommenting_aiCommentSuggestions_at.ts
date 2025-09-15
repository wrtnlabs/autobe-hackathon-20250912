import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAiCommentSuggestions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiCommentSuggestions";

export async function test_api_communityAi_admin_aiCommenting_aiCommentSuggestions_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiAiCommentSuggestions =
    await api.functional.communityAi.admin.aiCommenting.aiCommentSuggestions.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
