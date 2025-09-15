import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditLogs";

export async function test_api_communityAi_admin_auditLogs_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiAuditLogs =
    await api.functional.communityAi.admin.auditLogs.create(connection, {
      body: typia.random<ICommunityAiAuditLogs.ICreate>(),
    });
  typia.assert(output);
}
