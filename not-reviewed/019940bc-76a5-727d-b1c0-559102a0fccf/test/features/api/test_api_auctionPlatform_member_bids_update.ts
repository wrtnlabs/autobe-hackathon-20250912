import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformBid } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformBid";

export async function test_api_auctionPlatform_member_bids_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformBid =
    await api.functional.auctionPlatform.member.bids.update(connection, {
      bidId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAuctionPlatformBid.IUpdate>(),
    });
  typia.assert(output);
}
