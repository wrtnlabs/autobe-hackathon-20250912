import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserReport";

export async function test_api_communityAi_member_userReports_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiUserReport =
    await api.functional.communityAi.member.userReports.create(connection, {
      body: typia.random<ICommunityAiUserReport.ICreate>(),
    });
  typia.assert(output);
}
