import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformTeamLeaders } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformTeamLeaders";

export async function test_api_auctionPlatform_admin_teamLeaders_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformTeamLeaders =
    await api.functional.auctionPlatform.admin.teamLeaders.update(connection, {
      teamLeaderId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAuctionPlatformTeamLeaders.IUpdate>(),
    });
  typia.assert(output);
}
