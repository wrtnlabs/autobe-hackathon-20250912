import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAiServiceProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiServiceProvider";

export async function test_api_communityAi_admin_aiServiceProviders_update(
  connection: api.IConnection,
) {
  const output: ICommunityAiAiServiceProvider =
    await api.functional.communityAi.admin.aiServiceProviders.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiAiServiceProvider.IUpdate>(),
      },
    );
  typia.assert(output);
}
