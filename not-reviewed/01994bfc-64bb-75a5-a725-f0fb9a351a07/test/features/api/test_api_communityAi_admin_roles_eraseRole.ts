import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_admin_roles_eraseRole(
  connection: api.IConnection,
) {
  const output = await api.functional.communityAi.admin.roles.eraseRole(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
