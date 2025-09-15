import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerRawDataStorage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerRawDataStorage";

export async function test_api_politicalNewsCrawler_guest_rawDataStorage_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerRawDataStorage =
    await api.functional.politicalNewsCrawler.guest.rawDataStorage.at(
      connection,
      {
        rawDataStorageId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
