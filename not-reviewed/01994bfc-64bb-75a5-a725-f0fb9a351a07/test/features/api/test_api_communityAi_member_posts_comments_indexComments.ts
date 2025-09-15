import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageICommunityAiComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiComment";
import { ICommunityAiComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiComment";

export async function test_api_communityAi_member_posts_comments_indexComments(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiComment.ISummary =
    await api.functional.communityAi.member.posts.comments.indexComments(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiComment.IRequest>(),
      },
    );
  typia.assert(output);
}
