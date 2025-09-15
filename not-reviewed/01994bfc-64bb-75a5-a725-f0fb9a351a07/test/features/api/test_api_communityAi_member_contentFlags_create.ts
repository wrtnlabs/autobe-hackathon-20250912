import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiContentFlag";

export async function test_api_communityAi_member_contentFlags_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiContentFlag =
    await api.functional.communityAi.member.contentFlags.create(connection, {
      body: typia.random<ICommunityAiContentFlag.ICreate>(),
    });
  typia.assert(output);
}
