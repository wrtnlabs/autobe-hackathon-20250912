import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformApiIntegrations } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformApiIntegrations";
import { IAuctionPlatformApiIntegrations } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformApiIntegrations";

export async function test_api_auctionPlatform_admin_auctionPlatformApiIntegrations_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformApiIntegrations.ISummary =
    await api.functional.auctionPlatform.admin.auctionPlatformApiIntegrations.index(
      connection,
      {
        body: typia.random<IAuctionPlatformApiIntegrations.IRequest>(),
      },
    );
  typia.assert(output);
}
