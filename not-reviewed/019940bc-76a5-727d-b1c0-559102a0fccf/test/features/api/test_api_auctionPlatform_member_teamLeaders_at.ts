import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformTeamLeader } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformTeamLeader";

export async function test_api_auctionPlatform_member_teamLeaders_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformTeamLeader =
    await api.functional.auctionPlatform.member.teamLeaders.at(connection, {
      teamLeaderId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
