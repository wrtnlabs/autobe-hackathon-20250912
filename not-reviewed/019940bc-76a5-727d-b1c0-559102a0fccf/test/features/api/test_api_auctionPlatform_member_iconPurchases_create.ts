import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformIconPurchase } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformIconPurchase";

export async function test_api_auctionPlatform_member_iconPurchases_create(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformIconPurchase =
    await api.functional.auctionPlatform.member.iconPurchases.create(
      connection,
      {
        body: typia.random<IAuctionPlatformIconPurchase.ICreate>(),
      },
    );
  typia.assert(output);
}
