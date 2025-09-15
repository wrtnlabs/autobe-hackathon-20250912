import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIPoliticalNewsCrawlerRawDataStorageLocalCacheFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerRawDataStorageLocalCacheFile";
import { IPoliticalNewsCrawlerRawDataStorageLocalCacheFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerRawDataStorageLocalCacheFile";

export async function test_api_politicalNewsCrawler_guest_rawDataStorage_localCacheFiles_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerRawDataStorageLocalCacheFile.ISummary =
    await api.functional.politicalNewsCrawler.guest.rawDataStorage.localCacheFiles.index(
      connection,
      {
        rawDataStorageId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerRawDataStorageLocalCacheFile.IRequest>(),
      },
    );
  typia.assert(output);
}
