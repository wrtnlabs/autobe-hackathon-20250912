import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiAuditLog";
import { ICommunityAiAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditLog";

export async function test_api_communityAi_admin_auditLogs_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiAuditLog.ISummary =
    await api.functional.communityAi.admin.auditLogs.index(connection, {
      body: typia.random<ICommunityAiAuditLog.IRequest>(),
    });
  typia.assert(output);
}
