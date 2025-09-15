import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_moderator_contentFlags_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.communityAi.moderator.contentFlags.erase(
    connection,
    {
      contentFlagId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
