import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiMember";

export async function test_api_communityAi_member_members_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiMember =
    await api.functional.communityAi.member.members.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiMember.IUpdate>(),
    });
  typia.assert(output);
}
