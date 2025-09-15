import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiUserSessionJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserSessionJwtToken";

export async function test_api_communityAi_member_userSessions_jwtTokens_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiUserSessionJwtToken =
    await api.functional.communityAi.member.userSessions.jwtTokens.at(
      connection,
      {
        userSessionId: typia.random<string & tags.Format<"uuid">>(),
        jwtTokenId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
