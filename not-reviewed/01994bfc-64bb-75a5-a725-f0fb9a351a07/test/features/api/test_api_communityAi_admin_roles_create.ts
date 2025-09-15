import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiRoles";

export async function test_api_communityAi_admin_roles_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiRoles =
    await api.functional.communityAi.admin.roles.create(connection, {
      body: typia.random<ICommunityAiRoles.ICreate>(),
    });
  typia.assert(output);
}
