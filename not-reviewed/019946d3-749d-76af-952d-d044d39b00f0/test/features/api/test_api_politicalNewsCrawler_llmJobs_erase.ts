import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_politicalNewsCrawler_llmJobs_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.politicalNewsCrawler.llmJobs.erase(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
