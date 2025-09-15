import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiContentAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiContentAccessLogs";
import { ICommunityAiContentAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiContentAccessLogs";

export async function test_api_communityAi_moderator_auditContentAccessLogs_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiContentAccessLogs.ISummary =
    await api.functional.communityAi.moderator.auditContentAccessLogs.index(
      connection,
      {
        body: typia.random<ICommunityAiContentAccessLogs.IRequest>(),
      },
    );
  typia.assert(output);
}
