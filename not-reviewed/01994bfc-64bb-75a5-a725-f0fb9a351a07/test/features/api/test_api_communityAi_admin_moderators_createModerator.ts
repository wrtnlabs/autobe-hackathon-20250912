import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModerator";

export async function test_api_communityAi_admin_moderators_createModerator(
  connection: api.IConnection,
) {
  const output: ICommunityAiModerator =
    await api.functional.communityAi.admin.moderators.createModerator(
      connection,
      {
        body: typia.random<ICommunityAiModerator.ICreate>(),
      },
    );
  typia.assert(output);
}
