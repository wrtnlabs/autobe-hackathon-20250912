import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiUserSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiUserSessions";
import { ICommunityAiUserSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserSessions";

export async function test_api_communityAi_admin_userSessions_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiUserSessions.ISummary =
    await api.functional.communityAi.admin.userSessions.index(connection, {
      body: typia.random<ICommunityAiUserSessions.IRequest>(),
    });
  typia.assert(output);
}
