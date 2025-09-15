import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiPost";

export async function test_api_communityAi_moderator_members_posts_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiPost =
    await api.functional.communityAi.moderator.members.posts.update(
      connection,
      {
        memberId: typia.random<string & tags.Format<"uuid">>(),
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiPost.IUpdate>(),
      },
    );
  typia.assert(output);
}
