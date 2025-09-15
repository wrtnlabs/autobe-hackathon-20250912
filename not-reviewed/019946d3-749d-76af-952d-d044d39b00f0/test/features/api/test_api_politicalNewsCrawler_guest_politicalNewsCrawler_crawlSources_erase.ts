import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_politicalNewsCrawler_guest_politicalNewsCrawler_crawlSources_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.politicalNewsCrawler.guest.politicalNewsCrawler.crawlSources.erase(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
