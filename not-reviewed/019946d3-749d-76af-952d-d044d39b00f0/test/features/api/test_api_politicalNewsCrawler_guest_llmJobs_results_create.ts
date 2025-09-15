import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerLlmJobResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerLlmJobResult";

export async function test_api_politicalNewsCrawler_guest_llmJobs_results_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerLlmJobResult =
    await api.functional.politicalNewsCrawler.guest.llmJobs.results.create(
      connection,
      {
        llmJobId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerLlmJobResult.ICreate>(),
      },
    );
  typia.assert(output);
}
