import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommunityAiAiServiceProviders } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiServiceProviders";

export async function test_api_communityAi_admin_aiServiceProviders_atAiServiceProvider(
  connection: api.IConnection,
) {
  const output: ICommunityAiAiServiceProviders =
    await api.functional.communityAi.admin.aiServiceProviders.atAiServiceProvider(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
