import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAuditEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAuditEditHistory";

export async function test_api_communityAi_moderator_auditEditHistories_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiAuditEditHistory =
    await api.functional.communityAi.moderator.auditEditHistories.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
