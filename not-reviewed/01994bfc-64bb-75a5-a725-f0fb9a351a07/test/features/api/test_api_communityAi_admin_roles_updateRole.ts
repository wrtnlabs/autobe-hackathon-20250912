import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiRole";

export async function test_api_communityAi_admin_roles_updateRole(
  connection: api.IConnection,
) {
  const output: ICommunityAiRole =
    await api.functional.communityAi.admin.roles.updateRole(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiRole.IUpdate>(),
    });
  typia.assert(output);
}
