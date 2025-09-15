import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerGuests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerGuests";

export async function test_api_politicalNewsCrawler_guest_guests_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerGuests =
    await api.functional.politicalNewsCrawler.guest.guests.at(connection, {
      guestId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
