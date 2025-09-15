import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_communityAi_moderator_userReports_eraseUserReport(
  connection: api.IConnection,
) {
  const output =
    await api.functional.communityAi.moderator.userReports.eraseUserReport(
      connection,
      {
        userReportId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
