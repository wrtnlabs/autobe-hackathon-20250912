import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserSession";

export async function test_api_communityAi_admin_userSessions_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiUserSession =
    await api.functional.communityAi.admin.userSessions.create(connection, {
      body: typia.random<ICommunityAiUserSession.ICreate>(),
    });
  typia.assert(output);
}
