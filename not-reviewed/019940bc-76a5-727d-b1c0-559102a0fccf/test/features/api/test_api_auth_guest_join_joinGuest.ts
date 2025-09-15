import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformGuest";

export async function test_api_auth_guest_join_joinGuest(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join.joinGuest(connection, {
      body: typia.random<IAuctionPlatformGuest.ICreate>(),
    });
  typia.assert(output);
}
