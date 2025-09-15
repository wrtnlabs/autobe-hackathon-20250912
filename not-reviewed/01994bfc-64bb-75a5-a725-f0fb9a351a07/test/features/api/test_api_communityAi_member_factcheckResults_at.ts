import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiFactcheckResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiFactcheckResult";

export async function test_api_communityAi_member_factcheckResults_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiFactcheckResult =
    await api.functional.communityAi.member.factcheckResults.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
