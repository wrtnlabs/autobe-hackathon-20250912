import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_auctionPlatform_admin_calendarEvents_scheduleAuditLogs_eraseScheduleAuditLog(
  connection: api.IConnection,
) {
  const output =
    await api.functional.auctionPlatform.admin.calendarEvents.scheduleAuditLogs.eraseScheduleAuditLog(
      connection,
      {
        calendarEventId: typia.random<string & tags.Format<"uuid">>(),
        scheduleAuditLogId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
