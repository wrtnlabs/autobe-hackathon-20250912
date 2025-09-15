import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_politicalNewsCrawler_guest_llmJobs_metadata_eraseMetadata(
  connection: api.IConnection,
) {
  const output =
    await api.functional.politicalNewsCrawler.guest.llmJobs.metadata.eraseMetadata(
      connection,
      {
        llmJobId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
