import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_member_factcheckClaims_eraseFactcheckClaim(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.member.factcheckClaims.eraseFactcheckClaim(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
