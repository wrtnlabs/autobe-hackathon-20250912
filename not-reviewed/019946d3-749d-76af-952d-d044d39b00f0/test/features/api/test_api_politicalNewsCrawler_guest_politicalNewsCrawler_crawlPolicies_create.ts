import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerCrawlPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlPolicy";

export async function test_api_politicalNewsCrawler_guest_politicalNewsCrawler_crawlPolicies_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlPolicy =
    await api.functional.politicalNewsCrawler.guest.politicalNewsCrawler.crawlPolicies.create(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerCrawlPolicy.ICreate>(),
      },
    );
  typia.assert(output);
}
