import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformIconPurchase } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformIconPurchase";

export async function test_api_auctionPlatform_iconPurchases_atIconPurchase(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformIconPurchase =
    await api.functional.auctionPlatform.iconPurchases.atIconPurchase(
      connection,
      {
        iconPurchaseId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
