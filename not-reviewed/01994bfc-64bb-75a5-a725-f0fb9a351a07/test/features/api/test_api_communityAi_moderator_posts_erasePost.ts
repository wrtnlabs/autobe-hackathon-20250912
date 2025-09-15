import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_moderator_posts_erasePost(
  connection: api.IConnection,
) {
  const output = await api.functional.communityAi.moderator.posts.erasePost(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
