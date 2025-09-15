import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_politicalNewsCrawler_guest_rawDataStorage_localCacheFiles_eraseLocalCacheFile(
  connection: api.IConnection,
) {
  const output =
    await api.functional.politicalNewsCrawler.guest.rawDataStorage.localCacheFiles.eraseLocalCacheFile(
      connection,
      {
        rawDataStorageId: typia.random<string & tags.Format<"uuid">>(),
        localCacheFileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
