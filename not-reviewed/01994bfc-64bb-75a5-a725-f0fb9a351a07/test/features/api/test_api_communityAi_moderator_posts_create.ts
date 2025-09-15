import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiPosts";

export async function test_api_communityAi_moderator_posts_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiPosts =
    await api.functional.communityAi.moderator.posts.create(connection, {
      body: typia.random<ICommunityAiPosts.ICreate>(),
    });
  typia.assert(output);
}
