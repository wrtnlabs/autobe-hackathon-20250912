import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerApiUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerApiUsageMetric";

export async function test_api_politicalNewsCrawler_api_usageMetrics_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerApiUsageMetric =
    await api.functional.politicalNewsCrawler.api.usageMetrics.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
