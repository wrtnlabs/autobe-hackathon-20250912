import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_auctionPlatform_admin_teamLeaders_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.auctionPlatform.admin.teamLeaders.erase(
    connection,
    {
      teamLeaderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
