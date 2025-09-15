import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerRawDataStorage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerRawDataStorage";
import { IPoliticalNewsCrawlerRawDataStorage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerRawDataStorage";

export async function test_api_politicalNewsCrawler_guest_rawDataStorage_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerRawDataStorage.ISummary =
    await api.functional.politicalNewsCrawler.guest.rawDataStorage.index(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerRawDataStorage.IRequest>(),
      },
    );
  typia.assert(output);
}
