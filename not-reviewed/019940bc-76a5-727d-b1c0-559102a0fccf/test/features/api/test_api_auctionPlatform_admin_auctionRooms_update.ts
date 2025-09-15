import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformAuctionRoom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionRoom";

export async function test_api_auctionPlatform_admin_auctionRooms_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformAuctionRoom =
    await api.functional.auctionPlatform.admin.auctionRooms.update(connection, {
      auctionRoomId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAuctionPlatformAuctionRoom.IUpdate>(),
    });
  typia.assert(output);
}
