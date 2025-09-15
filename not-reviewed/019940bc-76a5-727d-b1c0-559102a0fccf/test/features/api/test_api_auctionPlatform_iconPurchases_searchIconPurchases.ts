import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformPageIAuctionPlatformIconPurchase } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformPageIAuctionPlatformIconPurchase";
import { IAuctionPlatformIconPurchase } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformIconPurchase";

export async function test_api_auctionPlatform_iconPurchases_searchIconPurchases(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformPageIAuctionPlatformIconPurchase.ISummary =
    await api.functional.auctionPlatform.iconPurchases.searchIconPurchases(
      connection,
      {
        body: typia.random<IAuctionPlatformIconPurchase.IRequest>(),
      },
    );
  typia.assert(output);
}
