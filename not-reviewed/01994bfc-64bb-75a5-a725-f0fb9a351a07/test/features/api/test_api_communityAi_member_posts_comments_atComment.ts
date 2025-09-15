import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiComment";

export async function test_api_communityAi_member_posts_comments_atComment(
  connection: api.IConnection,
) {
  const output: ICommunityAiComment =
    await api.functional.communityAi.member.posts.comments.atComment(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
