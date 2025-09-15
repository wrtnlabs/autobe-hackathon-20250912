import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiAuditEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditEditHistory";

export async function test_api_communityAi_moderator_auditEditHistories_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiAuditEditHistory =
    await api.functional.communityAi.moderator.auditEditHistories.create(
      connection,
      {
        body: typia.random<ICommunityAiAuditEditHistory.ICreate>(),
      },
    );
  typia.assert(output);
}
