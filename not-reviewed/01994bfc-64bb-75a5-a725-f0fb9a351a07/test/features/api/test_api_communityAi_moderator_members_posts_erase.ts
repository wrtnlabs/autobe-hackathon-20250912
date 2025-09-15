import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_moderator_members_posts_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.communityAi.moderator.members.posts.erase(
    connection,
    {
      memberId: typia.random<string & tags.Format<"uuid">>(),
      postId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
