import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_member_userSessions_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.communityAi.member.userSessions.erase(
    connection,
    {
      userSessionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
