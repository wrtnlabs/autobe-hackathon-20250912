import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

export async function test_api_politicalNewsCrawler_guest_llmJobs_results_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.politicalNewsCrawler.guest.llmJobs.results.erase(
      connection,
      {
        llmJobId: typia.random<string>(),
        id: typia.random<string>(),
      },
    );
  typia.assert(output);
}
