import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerRawDataStorageLocalCacheFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerRawDataStorageLocalCacheFile";

export async function test_api_politicalNewsCrawler_guest_rawDataStorage_localCacheFiles_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerRawDataStorageLocalCacheFile =
    await api.functional.politicalNewsCrawler.guest.rawDataStorage.localCacheFiles.at(
      connection,
      {
        rawDataStorageId: typia.random<string & tags.Format<"uuid">>(),
        localCacheFileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
