import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAdminAction";

export async function test_api_communityAi_admin_adminActions_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiAdminAction =
    await api.functional.communityAi.admin.adminActions.update(connection, {
      adminActionId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiAdminAction.IUpdate>(),
    });
  typia.assert(output);
}
