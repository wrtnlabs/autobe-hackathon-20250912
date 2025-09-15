import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerApiAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerApiAlert";
import { IPoliticalNewsCrawlerApiAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerApiAlert";

export async function test_api_politicalNewsCrawler_guest_apiAlerts_indexApiAlerts(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerApiAlert.ISummary =
    await api.functional.politicalNewsCrawler.guest.apiAlerts.indexApiAlerts(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerApiAlert.IRequest>(),
      },
    );
  typia.assert(output);
}
