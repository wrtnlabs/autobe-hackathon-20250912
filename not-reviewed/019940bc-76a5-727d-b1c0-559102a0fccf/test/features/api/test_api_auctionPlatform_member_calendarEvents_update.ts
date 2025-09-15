import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformCalendarEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformCalendarEvent";

export async function test_api_auctionPlatform_member_calendarEvents_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformCalendarEvent =
    await api.functional.auctionPlatform.member.calendarEvents.update(
      connection,
      {
        calendarEventId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IAuctionPlatformCalendarEvent.IUpdate>(),
      },
    );
  typia.assert(output);
}
