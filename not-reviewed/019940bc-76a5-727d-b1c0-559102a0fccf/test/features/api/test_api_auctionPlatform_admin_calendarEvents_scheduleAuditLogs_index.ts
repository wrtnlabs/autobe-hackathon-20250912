import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIAuctionPlatformScheduleAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformScheduleAuditLog";
import { IAuctionPlatformScheduleAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformScheduleAuditLog";

export async function test_api_auctionPlatform_admin_calendarEvents_scheduleAuditLogs_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformScheduleAuditLog.ISummary =
    await api.functional.auctionPlatform.admin.calendarEvents.scheduleAuditLogs.index(
      connection,
      {
        calendarEventId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IAuctionPlatformScheduleAuditLog.IRequest>(),
      },
    );
  typia.assert(output);
}
