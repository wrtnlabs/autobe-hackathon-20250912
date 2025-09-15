import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiComments";

export async function test_api_communityAi_moderator_posts_comments_updateComment(
  connection: api.IConnection,
) {
  const output: ICommunityAiComments =
    await api.functional.communityAi.moderator.posts.comments.updateComment(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiComments.IUpdate>(),
      },
    );
  typia.assert(output);
}
