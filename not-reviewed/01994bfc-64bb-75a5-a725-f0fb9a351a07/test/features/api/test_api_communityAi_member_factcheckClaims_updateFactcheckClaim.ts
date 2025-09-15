import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiFactcheckClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiFactcheckClaim";

export async function test_api_communityAi_member_factcheckClaims_updateFactcheckClaim(
  connection: api.IConnection,
) {
  const output: ICommunityAiFactcheckClaim =
    await api.functional.communityAi.member.factcheckClaims.updateFactcheckClaim(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiFactcheckClaim.IUpdate>(),
      },
    );
  typia.assert(output);
}
