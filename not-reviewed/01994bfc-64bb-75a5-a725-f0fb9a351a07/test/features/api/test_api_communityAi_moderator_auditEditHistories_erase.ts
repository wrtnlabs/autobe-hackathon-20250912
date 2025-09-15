import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_moderator_auditEditHistories_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.moderator.auditEditHistories.erase(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
