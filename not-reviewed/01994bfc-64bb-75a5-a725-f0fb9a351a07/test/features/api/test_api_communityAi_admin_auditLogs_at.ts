import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditLog";

export async function test_api_communityAi_admin_auditLogs_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiAuditLog =
    await api.functional.communityAi.admin.auditLogs.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
