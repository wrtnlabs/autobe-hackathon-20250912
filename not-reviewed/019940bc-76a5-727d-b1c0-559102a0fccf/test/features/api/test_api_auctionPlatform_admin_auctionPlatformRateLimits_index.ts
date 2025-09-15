import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformRateLimit";
import { IAuctionPlatformRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformRateLimit";

export async function test_api_auctionPlatform_admin_auctionPlatformRateLimits_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformRateLimit =
    await api.functional.auctionPlatform.admin.auctionPlatformRateLimits.index(
      connection,
      {
        body: typia.random<IAuctionPlatformRateLimit.IRequest>(),
      },
    );
  typia.assert(output);
}
