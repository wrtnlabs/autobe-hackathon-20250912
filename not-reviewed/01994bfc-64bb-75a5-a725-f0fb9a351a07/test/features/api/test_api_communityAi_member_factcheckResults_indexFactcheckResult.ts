import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiFactcheckResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiFactcheckResult";
import { ICommunityAiFactcheckResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiFactcheckResult";

export async function test_api_communityAi_member_factcheckResults_indexFactcheckResult(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiFactcheckResult =
    await api.functional.communityAi.member.factcheckResults.indexFactcheckResult(
      connection,
      {
        body: typia.random<ICommunityAiFactcheckResult.IRequest>(),
      },
    );
  typia.assert(output);
}
