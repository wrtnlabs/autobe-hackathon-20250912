import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerApiAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerApiAlert";

export async function test_api_politicalNewsCrawler_guest_apiAlerts_createApiAlert(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerApiAlert =
    await api.functional.politicalNewsCrawler.guest.apiAlerts.createApiAlert(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerApiAlert.ICreate>(),
      },
    );
  typia.assert(output);
}
