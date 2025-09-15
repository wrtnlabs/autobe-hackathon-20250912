import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformPointBalance } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformPointBalance";

export async function test_api_auctionPlatform_admin_pointBalances_create(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformPointBalance =
    await api.functional.auctionPlatform.admin.pointBalances.create(
      connection,
      {
        body: typia.random<IAuctionPlatformPointBalance.ICreate>(),
      },
    );
  typia.assert(output);
}
