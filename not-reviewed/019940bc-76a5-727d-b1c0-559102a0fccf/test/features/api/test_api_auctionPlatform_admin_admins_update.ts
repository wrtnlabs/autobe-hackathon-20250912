import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAdmin";

export async function test_api_auctionPlatform_admin_admins_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformAdmin =
    await api.functional.auctionPlatform.admin.admins.update(connection, {
      adminId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAuctionPlatformAdmin.IUpdate>(),
    });
  typia.assert(output);
}
