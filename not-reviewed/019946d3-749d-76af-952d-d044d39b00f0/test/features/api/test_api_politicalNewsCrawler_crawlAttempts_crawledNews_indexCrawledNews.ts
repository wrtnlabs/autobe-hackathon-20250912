import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIPoliticalNewsCrawlerCrawledNews } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerCrawledNews";
import { IPoliticalNewsCrawlerCrawledNews } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawledNews";

export async function test_api_politicalNewsCrawler_crawlAttempts_crawledNews_indexCrawledNews(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerCrawledNews.ISummary =
    await api.functional.politicalNewsCrawler.crawlAttempts.crawledNews.indexCrawledNews(
      connection,
      {
        crawlAttemptId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerCrawledNews.IRequest>(),
      },
    );
  typia.assert(output);
}
