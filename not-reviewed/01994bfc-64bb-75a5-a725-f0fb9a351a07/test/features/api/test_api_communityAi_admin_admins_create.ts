import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAdmin";

export async function test_api_communityAi_admin_admins_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiAdmin =
    await api.functional.communityAi.admin.admins.create(connection, {
      body: typia.random<ICommunityAiAdmin.ICreate>(),
    });
  typia.assert(output);
}
