import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiFactcheckFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiFactcheckFlag";
import { ICommunityAiFactcheckFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiFactcheckFlag";

export async function test_api_communityAi_moderator_factcheckFlags_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiFactcheckFlag.ISummary =
    await api.functional.communityAi.moderator.factcheckFlags.index(
      connection,
      {
        body: typia.random<ICommunityAiFactcheckFlag.IRequest>(),
      },
    );
  typia.assert(output);
}
