import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiFactcheckFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiFactcheckFlag";

export async function test_api_communityAi_moderator_factcheckFlags_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiFactcheckFlag =
    await api.functional.communityAi.moderator.factcheckFlags.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
