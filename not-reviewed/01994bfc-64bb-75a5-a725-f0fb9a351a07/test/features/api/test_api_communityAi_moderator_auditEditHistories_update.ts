import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAuditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditHistory";
import { ICommunityAiAuditEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditEditHistory";

export async function test_api_communityAi_moderator_auditEditHistories_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiAuditHistory =
    await api.functional.communityAi.moderator.auditEditHistories.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiAuditEditHistory.IUpdate>(),
      },
    );
  typia.assert(output);
}
