import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAdminAction";

export async function test_api_communityAi_admin_adminActions_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiAdminAction =
    await api.functional.communityAi.admin.adminActions.create(connection, {
      body: typia.random<ICommunityAiAdminAction.ICreate>(),
    });
  typia.assert(output);
}
