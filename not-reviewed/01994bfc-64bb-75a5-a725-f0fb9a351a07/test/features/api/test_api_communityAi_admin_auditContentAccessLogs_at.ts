import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAuditCommunityAiContentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditCommunityAiContentAccessLog";

export async function test_api_communityAi_admin_auditContentAccessLogs_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiAuditCommunityAiContentAccessLog =
    await api.functional.communityAi.admin.auditContentAccessLogs.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
