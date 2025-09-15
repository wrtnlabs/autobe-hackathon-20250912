import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerCrawlAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlAlerts";

export async function test_api_politicalNewsCrawler_guest_crawlAlerts_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlAlerts =
    await api.functional.politicalNewsCrawler.guest.crawlAlerts.create(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerCrawlAlerts.ICreate>(),
      },
    );
  typia.assert(output);
}
