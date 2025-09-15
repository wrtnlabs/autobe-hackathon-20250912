import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiAuditCommunityAiContentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditCommunityAiContentAccessLog";
import { ICommunityAiAuditCommunityAiContentAccessLogICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditCommunityAiContentAccessLogICreate";

export async function test_api_communityAi_admin_auditContentAccessLogs_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiAuditCommunityAiContentAccessLog =
    await api.functional.communityAi.admin.auditContentAccessLogs.create(
      connection,
      {
        body: typia.random<ICommunityAiAuditCommunityAiContentAccessLogICreate>(),
      },
    );
  typia.assert(output);
}
