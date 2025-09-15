import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiPosts";

export async function test_api_communityAi_member_posts_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiPosts =
    await api.functional.communityAi.member.posts.update(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiPosts.IUpdate>(),
    });
  typia.assert(output);
}
