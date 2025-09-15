import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformPointBalances } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformPointBalances";
import { IAuctionPlatformPointBalances } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformPointBalances";

export async function test_api_auctionPlatform_admin_pointBalances_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformPointBalances.ISummary =
    await api.functional.auctionPlatform.admin.pointBalances.index(connection, {
      body: typia.random<IAuctionPlatformPointBalances.IRequest>(),
    });
  typia.assert(output);
}
