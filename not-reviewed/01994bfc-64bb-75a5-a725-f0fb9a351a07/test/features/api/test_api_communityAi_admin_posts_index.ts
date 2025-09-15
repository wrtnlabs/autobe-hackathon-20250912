import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiPosts";
import { ICommunityAiPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiPosts";

export async function test_api_communityAi_admin_posts_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiPosts =
    await api.functional.communityAi.admin.posts.index(connection, {
      body: typia.random<ICommunityAiPosts.IRequest>(),
    });
  typia.assert(output);
}
