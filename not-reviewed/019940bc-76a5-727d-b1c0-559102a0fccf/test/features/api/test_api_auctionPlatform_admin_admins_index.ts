import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformAdmin";
import { IAuctionPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAdmin";

export async function test_api_auctionPlatform_admin_admins_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformAdmin.ISummary =
    await api.functional.auctionPlatform.admin.admins.index(connection, {
      body: typia.random<IAuctionPlatformAdmin.IRequest>(),
    });
  typia.assert(output);
}
