import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformAuctionPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionPlatformAuditLog";

export async function test_api_auctionPlatform_admin_auctionPlatformAuditLogs_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformAuctionPlatformAuditLog =
    await api.functional.auctionPlatform.admin.auctionPlatformAuditLogs.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
