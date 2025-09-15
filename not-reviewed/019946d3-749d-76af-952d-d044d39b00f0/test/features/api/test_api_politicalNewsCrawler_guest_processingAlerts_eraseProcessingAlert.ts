import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_politicalNewsCrawler_guest_processingAlerts_eraseProcessingAlert(
  connection: api.IConnection,
) {
  const output =
    await api.functional.politicalNewsCrawler.guest.processingAlerts.eraseProcessingAlert(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
