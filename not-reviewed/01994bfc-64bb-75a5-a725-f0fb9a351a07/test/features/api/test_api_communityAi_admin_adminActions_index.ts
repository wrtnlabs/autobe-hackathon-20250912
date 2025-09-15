import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiAdminAction";
import { ICommunityAiAdminActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAdminActions";

export async function test_api_communityAi_admin_adminActions_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiAdminAction.ISummary =
    await api.functional.communityAi.admin.adminActions.index(connection, {
      body: typia.random<ICommunityAiAdminActions.IRequest>(),
    });
  typia.assert(output);
}
