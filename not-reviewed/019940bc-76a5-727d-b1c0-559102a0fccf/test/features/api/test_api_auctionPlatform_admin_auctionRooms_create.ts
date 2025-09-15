import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformAuctionRoom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionRoom";

export async function test_api_auctionPlatform_admin_auctionRooms_create(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformAuctionRoom =
    await api.functional.auctionPlatform.admin.auctionRooms.create(connection, {
      body: typia.random<IAuctionPlatformAuctionRoom.ICreate>(),
    });
  typia.assert(output);
}
