import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_moderator_aiCommenting_aiCommentSuggestions_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.moderator.aiCommenting.aiCommentSuggestions.erase(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
