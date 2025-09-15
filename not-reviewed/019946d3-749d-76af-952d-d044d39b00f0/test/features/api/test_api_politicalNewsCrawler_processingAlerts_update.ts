import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerProcessingAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessingAlert";

export async function test_api_politicalNewsCrawler_processingAlerts_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerProcessingAlert =
    await api.functional.politicalNewsCrawler.processingAlerts.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerProcessingAlert.IUpdate>(),
      },
    );
  typia.assert(output);
}
