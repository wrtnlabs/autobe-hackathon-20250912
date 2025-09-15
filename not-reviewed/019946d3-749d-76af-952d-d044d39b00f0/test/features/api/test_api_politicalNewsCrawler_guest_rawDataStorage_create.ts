import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerRawDataStorage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerRawDataStorage";

export async function test_api_politicalNewsCrawler_guest_rawDataStorage_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerRawDataStorage =
    await api.functional.politicalNewsCrawler.guest.rawDataStorage.create(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerRawDataStorage.ICreate>(),
      },
    );
  typia.assert(output);
}
