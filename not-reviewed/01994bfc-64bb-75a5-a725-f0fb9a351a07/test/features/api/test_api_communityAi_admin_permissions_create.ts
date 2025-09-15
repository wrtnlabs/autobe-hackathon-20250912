import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiPermission";

export async function test_api_communityAi_admin_permissions_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiPermission =
    await api.functional.communityAi.admin.permissions.create(connection, {
      body: typia.random<ICommunityAiPermission.ICreate>(),
    });
  typia.assert(output);
}
