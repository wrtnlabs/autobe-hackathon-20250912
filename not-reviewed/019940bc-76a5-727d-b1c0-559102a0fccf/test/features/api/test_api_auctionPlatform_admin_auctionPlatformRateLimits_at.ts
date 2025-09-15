import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformRateLimit";

export async function test_api_auctionPlatform_admin_auctionPlatformRateLimits_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformRateLimit =
    await api.functional.auctionPlatform.admin.auctionPlatformRateLimits.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
