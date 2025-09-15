import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiFactcheckClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiFactcheckClaim";

export async function test_api_communityAi_member_factcheckClaims_createFactcheckClaim(
  connection: api.IConnection,
) {
  const output: ICommunityAiFactcheckClaim =
    await api.functional.communityAi.member.factcheckClaims.createFactcheckClaim(
      connection,
      {
        body: typia.random<ICommunityAiFactcheckClaim.ICreate>(),
      },
    );
  typia.assert(output);
}
