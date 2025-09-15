import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformCalendarEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformCalendarEvent";

export async function test_api_auctionPlatform_member_calendarEvents_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformCalendarEvent =
    await api.functional.auctionPlatform.member.calendarEvents.at(connection, {
      calendarEventId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
