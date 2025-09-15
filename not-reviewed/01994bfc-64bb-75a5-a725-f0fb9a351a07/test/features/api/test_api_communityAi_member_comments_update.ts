import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiComment";

export async function test_api_communityAi_member_comments_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiComment =
    await api.functional.communityAi.member.comments.update(connection, {
      commentId: typia.random<string>(),
      body: typia.random<ICommunityAiComment.IUpdate>(),
    });
  typia.assert(output);
}
