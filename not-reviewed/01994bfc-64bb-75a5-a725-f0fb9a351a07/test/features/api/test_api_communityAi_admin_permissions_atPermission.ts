import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiPermission";

export async function test_api_communityAi_admin_permissions_atPermission(
  connection: api.IConnection,
) {
  const output: ICommunityAiPermission =
    await api.functional.communityAi.admin.permissions.atPermission(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
