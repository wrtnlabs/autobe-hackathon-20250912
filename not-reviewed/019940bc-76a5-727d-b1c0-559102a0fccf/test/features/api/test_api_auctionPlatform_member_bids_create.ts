import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformBid } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformBid";

export async function test_api_auctionPlatform_member_bids_create(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformBid =
    await api.functional.auctionPlatform.member.bids.create(connection, {
      body: typia.random<IAuctionPlatformBid.ICreate>(),
    });
  typia.assert(output);
}
