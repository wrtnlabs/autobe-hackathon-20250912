import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerApiUsageMetricSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerApiUsageMetricSummary";
import { IPoliticalNewsCrawlerApiUsageMetricRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerApiUsageMetricRequest";

export async function test_api_politicalNewsCrawler_api_usageMetrics_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerApiUsageMetricSummary =
    await api.functional.politicalNewsCrawler.api.usageMetrics.index(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerApiUsageMetricRequest>(),
      },
    );
  typia.assert(output);
}
