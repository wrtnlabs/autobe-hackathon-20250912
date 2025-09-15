import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerLlmJobResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerLlmJobResult";

export async function test_api_politicalNewsCrawler_guest_llmJobs_results_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerLlmJobResult =
    await api.functional.politicalNewsCrawler.guest.llmJobs.results.at(
      connection,
      {
        llmJobId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
