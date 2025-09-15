import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiMember";

export async function test_api_communityAi_members_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiMember =
    await api.functional.communityAi.members.create(connection, {
      body: typia.random<ICommunityAiMember.ICreate>(),
    });
  typia.assert(output);
}
