import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerProcessingAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessingAlert";

export async function test_api_politicalNewsCrawler_processingAlerts_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerProcessingAlert =
    await api.functional.politicalNewsCrawler.processingAlerts.create(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerProcessingAlert.ICreate>(),
      },
    );
  typia.assert(output);
}
