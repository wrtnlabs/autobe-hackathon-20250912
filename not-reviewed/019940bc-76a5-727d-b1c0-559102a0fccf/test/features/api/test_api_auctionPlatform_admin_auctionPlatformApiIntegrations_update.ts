import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformApiIntegrations } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformApiIntegrations";

export async function test_api_auctionPlatform_admin_auctionPlatformApiIntegrations_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformApiIntegrations =
    await api.functional.auctionPlatform.admin.auctionPlatformApiIntegrations.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IAuctionPlatformApiIntegrations.IUpdate>(),
      },
    );
  typia.assert(output);
}
