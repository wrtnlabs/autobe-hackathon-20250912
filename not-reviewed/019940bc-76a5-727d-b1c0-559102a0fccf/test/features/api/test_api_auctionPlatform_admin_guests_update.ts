import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformGuest";

export async function test_api_auctionPlatform_admin_guests_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformGuest =
    await api.functional.auctionPlatform.admin.guests.update(connection, {
      guestId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAuctionPlatformGuest.IUpdate>(),
    });
  typia.assert(output);
}
