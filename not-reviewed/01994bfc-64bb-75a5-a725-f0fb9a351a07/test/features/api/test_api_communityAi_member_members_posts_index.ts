import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageICommunityAiPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiPosts";
import { ICommunityAiPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiPosts";

export async function test_api_communityAi_member_members_posts_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiPosts.ISummary =
    await api.functional.communityAi.member.members.posts.index(connection, {
      memberId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiPosts.IRequest>(),
    });
  typia.assert(output);
}
