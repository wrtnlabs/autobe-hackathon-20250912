import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiComments";

export async function test_api_communityAi_member_comments_atComment(
  connection: api.IConnection,
) {
  const output: ICommunityAiComments =
    await api.functional.communityAi.member.comments.atComment(connection, {
      commentId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
