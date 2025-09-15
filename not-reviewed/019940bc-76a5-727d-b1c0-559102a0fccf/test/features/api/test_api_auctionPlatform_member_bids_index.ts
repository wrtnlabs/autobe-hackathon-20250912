import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformBids } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformBids";
import { IAuctionPlatformBids } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformBids";

export async function test_api_auctionPlatform_member_bids_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformBids.ISummary =
    await api.functional.auctionPlatform.member.bids.index(connection, {
      body: typia.random<IAuctionPlatformBids.IRequest>(),
    });
  typia.assert(output);
}
