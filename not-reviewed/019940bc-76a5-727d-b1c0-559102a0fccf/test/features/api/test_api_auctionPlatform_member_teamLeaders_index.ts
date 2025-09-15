import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformTeamLeader } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformTeamLeader";
import { IAuctionPlatformTeamLeader } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformTeamLeader";

export async function test_api_auctionPlatform_member_teamLeaders_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformTeamLeader.ISummary =
    await api.functional.auctionPlatform.member.teamLeaders.index(connection, {
      body: typia.random<IAuctionPlatformTeamLeader.IRequest>(),
    });
  typia.assert(output);
}
