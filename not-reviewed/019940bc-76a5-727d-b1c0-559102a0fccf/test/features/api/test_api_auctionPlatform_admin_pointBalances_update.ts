import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformPointBalance } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformPointBalance";

export async function test_api_auctionPlatform_admin_pointBalances_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformPointBalance =
    await api.functional.auctionPlatform.admin.pointBalances.update(
      connection,
      {
        pointBalanceId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IAuctionPlatformPointBalance.IUpdate>(),
      },
    );
  typia.assert(output);
}
