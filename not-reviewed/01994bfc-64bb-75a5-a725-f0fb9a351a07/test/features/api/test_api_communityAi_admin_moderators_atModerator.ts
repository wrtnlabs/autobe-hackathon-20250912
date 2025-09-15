import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModerator";

export async function test_api_communityAi_admin_moderators_atModerator(
  connection: api.IConnection,
) {
  const output: ICommunityAiModerator =
    await api.functional.communityAi.admin.moderators.atModerator(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
