import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiComment";

export async function test_api_communityAi_member_posts_comments_createComment(
  connection: api.IConnection,
) {
  const output: ICommunityAiComment =
    await api.functional.communityAi.member.posts.comments.createComment(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiComment.ICreate>(),
      },
    );
  typia.assert(output);
}
