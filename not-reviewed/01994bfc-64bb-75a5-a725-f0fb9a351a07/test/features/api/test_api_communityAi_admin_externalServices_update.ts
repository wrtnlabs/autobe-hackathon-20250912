import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiExternalServices } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiExternalServices";

export async function test_api_communityAi_admin_externalServices_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiExternalServices =
    await api.functional.communityAi.admin.externalServices.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommunityAiExternalServices.IUpdate>(),
    });
  typia.assert(output);
}
