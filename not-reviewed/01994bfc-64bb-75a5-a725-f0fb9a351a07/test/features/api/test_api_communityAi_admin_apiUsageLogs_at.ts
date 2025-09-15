import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiApiUsageLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiApiUsageLog";

export async function test_api_communityAi_admin_apiUsageLogs_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiApiUsageLog =
    await api.functional.communityAi.admin.apiUsageLogs.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
