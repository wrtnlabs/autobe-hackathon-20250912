import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_auctionPlatform_admin_auctionRooms_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.auctionPlatform.admin.auctionRooms.erase(
    connection,
    {
      auctionRoomId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
