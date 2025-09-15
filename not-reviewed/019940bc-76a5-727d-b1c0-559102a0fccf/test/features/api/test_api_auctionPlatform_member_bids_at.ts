import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformBid } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformBid";

export async function test_api_auctionPlatform_member_bids_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformBid =
    await api.functional.auctionPlatform.member.bids.at(connection, {
      bidId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
