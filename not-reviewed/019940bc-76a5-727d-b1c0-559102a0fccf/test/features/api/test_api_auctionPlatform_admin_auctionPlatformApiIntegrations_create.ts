import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformApiIntegrations } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformApiIntegrations";

export async function test_api_auctionPlatform_admin_auctionPlatformApiIntegrations_create(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformApiIntegrations =
    await api.functional.auctionPlatform.admin.auctionPlatformApiIntegrations.create(
      connection,
      {
        body: typia.random<IAuctionPlatformApiIntegrations.ICreate>(),
      },
    );
  typia.assert(output);
}
