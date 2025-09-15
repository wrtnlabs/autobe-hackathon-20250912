import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerLlmJobs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerLlmJobs";
import { IPoliticalNewsCrawlerLlmJobs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerLlmJobs";

export async function test_api_politicalNewsCrawler_llmJobs_indexLlmJobs(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerLlmJobs.ISummary =
    await api.functional.politicalNewsCrawler.llmJobs.indexLlmJobs(connection, {
      body: typia.random<IPoliticalNewsCrawlerLlmJobs.IRequest>(),
    });
  typia.assert(output);
}
