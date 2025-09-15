import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAdmin";

export async function test_api_auctionPlatform_admin_admins_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformAdmin =
    await api.functional.auctionPlatform.admin.admins.at(connection, {
      adminId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
