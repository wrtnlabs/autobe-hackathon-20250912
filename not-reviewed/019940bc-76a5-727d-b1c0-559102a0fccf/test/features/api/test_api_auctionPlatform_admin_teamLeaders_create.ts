import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformTeamLeaders } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformTeamLeaders";

export async function test_api_auctionPlatform_admin_teamLeaders_create(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformTeamLeaders =
    await api.functional.auctionPlatform.admin.teamLeaders.create(connection, {
      body: typia.random<IAuctionPlatformTeamLeaders.ICreate>(),
    });
  typia.assert(output);
}
