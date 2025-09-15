import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_admin_notificationProviders_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.admin.notificationProviders.erase(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
