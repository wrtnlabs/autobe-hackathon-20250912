import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformAuctionRoom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionRoom";

export async function test_api_auctionPlatform_admin_auctionRooms_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformAuctionRoom =
    await api.functional.auctionPlatform.admin.auctionRooms.at(connection, {
      auctionRoomId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
