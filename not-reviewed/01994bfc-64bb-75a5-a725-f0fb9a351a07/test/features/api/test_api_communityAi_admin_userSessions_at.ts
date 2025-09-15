import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserSession";

export async function test_api_communityAi_admin_userSessions_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiUserSession =
    await api.functional.communityAi.admin.userSessions.at(connection, {
      userSessionId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
