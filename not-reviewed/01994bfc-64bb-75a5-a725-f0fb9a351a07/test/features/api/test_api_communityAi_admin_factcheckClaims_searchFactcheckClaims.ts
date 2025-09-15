import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiFactcheckClaims } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiFactcheckClaims";
import { ICommunityAiFactcheckClaims } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiFactcheckClaims";

export async function test_api_communityAi_admin_factcheckClaims_searchFactcheckClaims(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiFactcheckClaims.ISummary =
    await api.functional.communityAi.admin.factcheckClaims.searchFactcheckClaims(
      connection,
      {
        body: typia.random<ICommunityAiFactcheckClaims.IRequest>(),
      },
    );
  typia.assert(output);
}
