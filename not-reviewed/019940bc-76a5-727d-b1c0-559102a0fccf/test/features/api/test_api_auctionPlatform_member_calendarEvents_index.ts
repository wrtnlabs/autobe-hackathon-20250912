import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformCalendarEvents } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformCalendarEvents";
import { IAuctionPlatformCalendarEvents } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformCalendarEvents";

export async function test_api_auctionPlatform_member_calendarEvents_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformCalendarEvents.ISummary =
    await api.functional.auctionPlatform.member.calendarEvents.index(
      connection,
      {
        body: typia.random<IAuctionPlatformCalendarEvents.IRequest>(),
      },
    );
  typia.assert(output);
}
