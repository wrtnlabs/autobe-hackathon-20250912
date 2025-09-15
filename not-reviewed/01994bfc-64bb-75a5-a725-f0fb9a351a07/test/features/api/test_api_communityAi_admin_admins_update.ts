import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAdmin";

export async function test_api_communityAi_admin_admins_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiAdmin =
    await api.functional.communityAi.admin.admins.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiAdmin.IUpdate>(),
    });
  typia.assert(output);
}
