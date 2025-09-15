import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerPopularTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerPopularTopics";
import { IPoliticalNewsCrawlerPopularTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerPopularTopics";

export async function test_api_politicalNewsCrawler_popularTopics_searchPopularTopics(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerPopularTopics =
    await api.functional.politicalNewsCrawler.popularTopics.searchPopularTopics(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerPopularTopics.IRequest>(),
      },
    );
  typia.assert(output);
}
