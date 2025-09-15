import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformIconPurchase } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformIconPurchase";

export async function test_api_auctionPlatform_member_iconPurchases_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformIconPurchase =
    await api.functional.auctionPlatform.member.iconPurchases.update(
      connection,
      {
        iconPurchaseId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IAuctionPlatformIconPurchase.IUpdate>(),
      },
    );
  typia.assert(output);
}
