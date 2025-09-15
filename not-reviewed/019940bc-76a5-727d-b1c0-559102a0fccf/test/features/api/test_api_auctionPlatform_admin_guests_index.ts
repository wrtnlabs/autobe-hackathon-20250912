import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformGuest";
import { IAuctionPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformGuest";

export async function test_api_auctionPlatform_admin_guests_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformGuest.ISummary =
    await api.functional.auctionPlatform.admin.guests.index(connection, {
      body: typia.random<IAuctionPlatformGuest.IRequest>(),
    });
  typia.assert(output);
}
