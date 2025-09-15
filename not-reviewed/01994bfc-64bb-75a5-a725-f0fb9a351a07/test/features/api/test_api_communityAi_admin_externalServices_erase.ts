import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_admin_externalServices_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.communityAi.admin.externalServices.erase(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
