import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditLogs";

export async function test_api_communityAi_admin_auditLogs_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiAuditLogs =
    await api.functional.communityAi.admin.auditLogs.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiAuditLogs.IUpdate>(),
    });
  typia.assert(output);
}
