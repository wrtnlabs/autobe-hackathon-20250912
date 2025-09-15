import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiRoles";
import { ICommunityAiRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiRoles";

export async function test_api_communityAi_admin_roles_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiRoles.ISummary =
    await api.functional.communityAi.admin.roles.index(connection, {
      body: typia.random<ICommunityAiRoles.IRequest>(),
    });
  typia.assert(output);
}
