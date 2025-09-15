import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerCrawlPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerCrawlPolicy";
import { IPoliticalNewsCrawlerCrawlPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlPolicy";

export async function test_api_politicalNewsCrawler_guest_politicalNewsCrawler_crawlPolicies_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerCrawlPolicy.ISummary =
    await api.functional.politicalNewsCrawler.guest.politicalNewsCrawler.crawlPolicies.index(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerCrawlPolicy.IRequest>(),
      },
    );
  typia.assert(output);
}
