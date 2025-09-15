import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_admin_posts_comments_eraseComment(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.admin.posts.comments.eraseComment(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
