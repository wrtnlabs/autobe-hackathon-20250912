import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerApiAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerApiAlert";

export async function test_api_politicalNewsCrawler_guest_apiAlerts_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerApiAlert =
    await api.functional.politicalNewsCrawler.guest.apiAlerts.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerApiAlert.IUpdate>(),
      },
    );
  typia.assert(output);
}
