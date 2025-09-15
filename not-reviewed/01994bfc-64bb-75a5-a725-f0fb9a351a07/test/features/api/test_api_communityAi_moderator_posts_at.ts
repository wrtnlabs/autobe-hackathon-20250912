import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiPosts";

export async function test_api_communityAi_moderator_posts_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiPosts =
    await api.functional.communityAi.moderator.posts.at(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
