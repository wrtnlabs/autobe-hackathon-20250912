import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerProcessingAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessingAlert";

export async function test_api_politicalNewsCrawler_processingAlerts_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerProcessingAlert =
    await api.functional.politicalNewsCrawler.processingAlerts.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
