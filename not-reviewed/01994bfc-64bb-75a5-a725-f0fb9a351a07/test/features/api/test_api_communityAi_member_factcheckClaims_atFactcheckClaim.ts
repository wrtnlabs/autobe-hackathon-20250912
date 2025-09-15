import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiFactcheckClaims } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiFactcheckClaims";

export async function test_api_communityAi_member_factcheckClaims_atFactcheckClaim(
  connection: api.IConnection,
) {
  const output: ICommunityAiFactcheckClaims =
    await api.functional.communityAi.member.factcheckClaims.atFactcheckClaim(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
