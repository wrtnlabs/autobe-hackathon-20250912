import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserReport";

export async function test_api_communityAi_moderator_userReports_at(
  connection: api.IConnection,
) {
  const output: ICommunityAiUserReport =
    await api.functional.communityAi.moderator.userReports.at(connection, {
      userReportId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
