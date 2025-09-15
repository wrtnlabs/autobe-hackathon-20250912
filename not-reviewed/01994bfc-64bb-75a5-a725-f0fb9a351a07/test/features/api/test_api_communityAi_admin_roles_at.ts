import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiRoles";

export async function test_api_communityAi_admin_roles_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiRoles =
    await api.functional.communityAi.admin.roles.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
