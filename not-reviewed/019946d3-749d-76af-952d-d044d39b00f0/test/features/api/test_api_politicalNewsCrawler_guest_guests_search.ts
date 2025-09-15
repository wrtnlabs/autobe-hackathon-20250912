import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerGuests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerGuests";
import { IPoliticalNewsCrawlerGuests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerGuests";

export async function test_api_politicalNewsCrawler_guest_guests_search(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerGuests.ISummary =
    await api.functional.politicalNewsCrawler.guest.guests.search(connection, {
      body: typia.random<IPoliticalNewsCrawlerGuests.IRequest>(),
    });
  typia.assert(output);
}
