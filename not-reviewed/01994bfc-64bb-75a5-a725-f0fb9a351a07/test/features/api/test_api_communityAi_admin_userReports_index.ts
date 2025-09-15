import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiUserReports } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiUserReports";
import { ICommunityAiUserReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserReports";

export async function test_api_communityAi_admin_userReports_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiUserReports.ISummary =
    await api.functional.communityAi.admin.userReports.index(connection, {
      body: typia.random<ICommunityAiUserReports.IRequest>(),
    });
  typia.assert(output);
}
