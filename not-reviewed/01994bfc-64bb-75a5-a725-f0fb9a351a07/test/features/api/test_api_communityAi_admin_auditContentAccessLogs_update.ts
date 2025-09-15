import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAuditCommunityAiContentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditCommunityAiContentAccessLog";
import { ICommunityAiAuditCommunityAiContentAccessLogIUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditCommunityAiContentAccessLogIUpdate";

export async function test_api_communityAi_admin_auditContentAccessLogs_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiAuditCommunityAiContentAccessLog =
    await api.functional.communityAi.admin.auditContentAccessLogs.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiAuditCommunityAiContentAccessLogIUpdate>(),
      },
    );
  typia.assert(output);
}
