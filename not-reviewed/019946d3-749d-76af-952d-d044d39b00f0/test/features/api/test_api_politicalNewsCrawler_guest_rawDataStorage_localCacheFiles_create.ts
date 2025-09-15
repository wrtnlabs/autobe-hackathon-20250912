import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerRawDataStorageLocalCacheFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerRawDataStorageLocalCacheFile";

export async function test_api_politicalNewsCrawler_guest_rawDataStorage_localCacheFiles_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerRawDataStorageLocalCacheFile =
    await api.functional.politicalNewsCrawler.guest.rawDataStorage.localCacheFiles.create(
      connection,
      {
        rawDataStorageId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerRawDataStorageLocalCacheFile.ICreate>(),
      },
    );
  typia.assert(output);
}
