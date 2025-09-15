import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_member_userSessions_jwtTokens_eraseJwtToken(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.member.userSessions.jwtTokens.eraseJwtToken(
      connection,
      {
        userSessionId: typia.random<string & tags.Format<"uuid">>(),
        jwtTokenId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
