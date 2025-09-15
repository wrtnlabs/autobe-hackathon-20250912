import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformApiIntegrations } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformApiIntegrations";

export async function test_api_auctionPlatform_admin_auctionPlatformApiIntegrations_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformApiIntegrations =
    await api.functional.auctionPlatform.admin.auctionPlatformApiIntegrations.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
