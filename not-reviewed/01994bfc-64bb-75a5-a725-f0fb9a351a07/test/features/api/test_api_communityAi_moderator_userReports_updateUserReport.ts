import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserReport";

export async function test_api_communityAi_moderator_userReports_updateUserReport(
  connection: api.IConnection,
) {
  const output: ICommunityAiUserReport =
    await api.functional.communityAi.moderator.userReports.updateUserReport(
      connection,
      {
        userReportId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiUserReport.IUpdate>(),
      },
    );
  typia.assert(output);
}
