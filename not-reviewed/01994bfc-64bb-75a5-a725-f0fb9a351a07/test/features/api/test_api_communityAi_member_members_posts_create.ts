import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiPost";

export async function test_api_communityAi_member_members_posts_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiPost =
    await api.functional.communityAi.member.members.posts.create(connection, {
      memberId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiPost.ICreate>(),
    });
  typia.assert(output);
}
