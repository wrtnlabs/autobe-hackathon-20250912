import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerCrawlAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlAlerts";

export async function test_api_politicalNewsCrawler_guest_crawlAlerts_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlAlerts =
    await api.functional.politicalNewsCrawler.guest.crawlAlerts.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerCrawlAlerts.IUpdate>(),
      },
    );
  typia.assert(output);
}
