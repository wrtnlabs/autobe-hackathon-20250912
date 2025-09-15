import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformAuctionPlatformRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionPlatformRateLimit";

export async function test_api_auctionPlatform_admin_auctionPlatformRateLimits_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformAuctionPlatformRateLimit =
    await api.functional.auctionPlatform.admin.auctionPlatformRateLimits.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IAuctionPlatformAuctionPlatformRateLimit.IUpdate>(),
      },
    );
  typia.assert(output);
}
