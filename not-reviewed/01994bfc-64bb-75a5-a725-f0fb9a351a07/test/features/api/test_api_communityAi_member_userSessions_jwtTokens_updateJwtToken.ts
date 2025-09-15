import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiJwtTokens } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiJwtTokens";

export async function test_api_communityAi_member_userSessions_jwtTokens_updateJwtToken(
  connection: api.IConnection,
) {
  const output: ICommunityAiJwtTokens =
    await api.functional.communityAi.member.userSessions.jwtTokens.updateJwtToken(
      connection,
      {
        userSessionId: typia.random<string & tags.Format<"uuid">>(),
        jwtTokenId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiJwtTokens.IUpdate>(),
      },
    );
  typia.assert(output);
}
