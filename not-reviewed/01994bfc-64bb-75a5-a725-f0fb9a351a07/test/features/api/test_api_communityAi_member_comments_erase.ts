import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

export async function test_api_communityAi_member_comments_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.communityAi.member.comments.erase(
    connection,
    {
      commentId: typia.random<string>(),
    },
  );
  typia.assert(output);
}
