import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerLlmJobs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerLlmJobs";

export async function test_api_politicalNewsCrawler_llmJobs_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerLlmJobs =
    await api.functional.politicalNewsCrawler.llmJobs.create(connection, {
      body: typia.random<IPoliticalNewsCrawlerLlmJobs.ICreate>(),
    });
  typia.assert(output);
}
