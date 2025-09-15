import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerApiAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerApiAlert";

export async function test_api_politicalNewsCrawler_guest_apiAlerts_atApiAlert(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerApiAlert =
    await api.functional.politicalNewsCrawler.guest.apiAlerts.atApiAlert(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
