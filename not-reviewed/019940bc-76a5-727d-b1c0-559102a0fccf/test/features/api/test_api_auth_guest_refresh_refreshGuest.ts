import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformGuest";

export async function test_api_auth_guest_refresh_refreshGuest(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformGuest.IAuthorized =
    await api.functional.auth.guest.refresh.refreshGuest(connection, {
      body: typia.random<IAuctionPlatformGuest.IRefresh>(),
    });
  typia.assert(output);
}
