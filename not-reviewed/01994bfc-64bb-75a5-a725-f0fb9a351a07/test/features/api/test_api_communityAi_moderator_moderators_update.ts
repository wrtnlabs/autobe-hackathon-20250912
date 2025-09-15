import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModerator";

export async function test_api_communityAi_moderator_moderators_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiModerator =
    await api.functional.communityAi.moderator.moderators.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiModerator.IUpdate>(),
    });
  typia.assert(output);
}
