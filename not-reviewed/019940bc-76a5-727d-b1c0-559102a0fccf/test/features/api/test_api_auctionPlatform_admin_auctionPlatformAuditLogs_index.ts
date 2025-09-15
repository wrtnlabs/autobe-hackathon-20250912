import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformAuctionPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformAuctionPlatformAuditLog";
import { IAuctionPlatformAuctionPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionPlatformAuditLog";

export async function test_api_auctionPlatform_admin_auctionPlatformAuditLogs_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformAuctionPlatformAuditLog =
    await api.functional.auctionPlatform.admin.auctionPlatformAuditLogs.index(
      connection,
      {
        body: typia.random<IAuctionPlatformAuctionPlatformAuditLog.IRequest>(),
      },
    );
  typia.assert(output);
}
