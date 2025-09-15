import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiAdmin";
import { ICommunityAiAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAdmin";

export async function test_api_communityAi_admin_admins_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiAdmin =
    await api.functional.communityAi.admin.admins.index(connection, {
      body: typia.random<ICommunityAiAdmin.IRequest>(),
    });
  typia.assert(output);
}
