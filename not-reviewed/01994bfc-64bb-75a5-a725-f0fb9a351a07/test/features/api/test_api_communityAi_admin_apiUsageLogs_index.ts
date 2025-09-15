import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiApiUsageLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiApiUsageLog";
import { ICommunityAiApiUsageLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiApiUsageLog";

export async function test_api_communityAi_admin_apiUsageLogs_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiApiUsageLog =
    await api.functional.communityAi.admin.apiUsageLogs.index(connection, {
      body: typia.random<ICommunityAiApiUsageLog.IRequest>(),
    });
  typia.assert(output);
}
