import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerProcessingAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerProcessingAlert";
import { IPoliticalNewsCrawlerProcessingAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessingAlert";

export async function test_api_politicalNewsCrawler_processingAlerts_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerProcessingAlert =
    await api.functional.politicalNewsCrawler.processingAlerts.index(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerProcessingAlert.IRequest>(),
      },
    );
  typia.assert(output);
}
