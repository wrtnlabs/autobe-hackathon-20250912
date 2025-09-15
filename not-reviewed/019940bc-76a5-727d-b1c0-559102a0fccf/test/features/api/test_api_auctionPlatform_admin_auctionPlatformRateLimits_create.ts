import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformRateLimit";

export async function test_api_auctionPlatform_admin_auctionPlatformRateLimits_create(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformRateLimit =
    await api.functional.auctionPlatform.admin.auctionPlatformRateLimits.create(
      connection,
      {
        body: typia.random<IAuctionPlatformRateLimit.ICreate>(),
      },
    );
  typia.assert(output);
}
