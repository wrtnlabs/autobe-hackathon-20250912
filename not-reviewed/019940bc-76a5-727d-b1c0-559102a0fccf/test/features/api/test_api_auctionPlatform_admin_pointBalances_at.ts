import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformPointBalance } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformPointBalance";

export async function test_api_auctionPlatform_admin_pointBalances_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformPointBalance =
    await api.functional.auctionPlatform.admin.pointBalances.at(connection, {
      pointBalanceId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
