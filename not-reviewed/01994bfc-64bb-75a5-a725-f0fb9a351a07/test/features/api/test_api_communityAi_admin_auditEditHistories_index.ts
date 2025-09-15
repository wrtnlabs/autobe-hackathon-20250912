import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiAuditEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiAuditEditHistory";
import { ICommunityAiAuditEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditEditHistory";

export async function test_api_communityAi_admin_auditEditHistories_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiAuditEditHistory =
    await api.functional.communityAi.admin.auditEditHistories.index(
      connection,
      {
        body: typia.random<ICommunityAiAuditEditHistory.IRequest>(),
      },
    );
  typia.assert(output);
}
