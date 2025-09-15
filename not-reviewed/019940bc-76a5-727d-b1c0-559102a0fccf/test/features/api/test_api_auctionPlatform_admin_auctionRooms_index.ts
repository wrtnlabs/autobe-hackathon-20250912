import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformAuctionRoom } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformAuctionRoom";
import { IAuctionPlatformAuctionRoom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionRoom";

export async function test_api_auctionPlatform_admin_auctionRooms_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformAuctionRoom.ISummary =
    await api.functional.auctionPlatform.admin.auctionRooms.index(connection, {
      body: typia.random<IAuctionPlatformAuctionRoom.IRequest>(),
    });
  typia.assert(output);
}
