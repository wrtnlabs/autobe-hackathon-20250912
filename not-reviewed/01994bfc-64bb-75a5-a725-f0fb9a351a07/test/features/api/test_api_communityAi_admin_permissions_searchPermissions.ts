import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiPermission";
import { ICommunityAiPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiPermission";

export async function test_api_communityAi_admin_permissions_searchPermissions(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiPermission.ISummary =
    await api.functional.communityAi.admin.permissions.searchPermissions(
      connection,
      {
        body: typia.random<ICommunityAiPermission.IRequest>(),
      },
    );
  typia.assert(output);
}
