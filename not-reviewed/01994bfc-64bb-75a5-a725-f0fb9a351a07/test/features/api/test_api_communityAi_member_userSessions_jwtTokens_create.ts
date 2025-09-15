import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiUserSessionJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserSessionJwtToken";

export async function test_api_communityAi_member_userSessions_jwtTokens_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiUserSessionJwtToken =
    await api.functional.communityAi.member.userSessions.jwtTokens.create(
      connection,
      {
        userSessionId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiUserSessionJwtToken.ICreate>(),
      },
    );
  typia.assert(output);
}
