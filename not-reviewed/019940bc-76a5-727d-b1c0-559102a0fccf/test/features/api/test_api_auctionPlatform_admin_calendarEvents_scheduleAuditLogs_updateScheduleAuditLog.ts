import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformScheduleAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformScheduleAuditLog";

export async function test_api_auctionPlatform_admin_calendarEvents_scheduleAuditLogs_updateScheduleAuditLog(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformScheduleAuditLog =
    await api.functional.auctionPlatform.admin.calendarEvents.scheduleAuditLogs.updateScheduleAuditLog(
      connection,
      {
        calendarEventId: typia.random<string & tags.Format<"uuid">>(),
        scheduleAuditLogId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IAuctionPlatformScheduleAuditLog.IUpdate>(),
      },
    );
  typia.assert(output);
}
