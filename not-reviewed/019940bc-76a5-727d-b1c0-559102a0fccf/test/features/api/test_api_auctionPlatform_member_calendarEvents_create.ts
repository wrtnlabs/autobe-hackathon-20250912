import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformCalendarEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformCalendarEvent";

export async function test_api_auctionPlatform_member_calendarEvents_create(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformCalendarEvent =
    await api.functional.auctionPlatform.member.calendarEvents.create(
      connection,
      {
        body: typia.random<IAuctionPlatformCalendarEvent.ICreate>(),
      },
    );
  typia.assert(output);
}
