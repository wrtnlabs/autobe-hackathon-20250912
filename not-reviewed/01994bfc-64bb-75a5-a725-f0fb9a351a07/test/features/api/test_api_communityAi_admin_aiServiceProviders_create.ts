import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiAiServiceProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiServiceProvider";

export async function test_api_communityAi_admin_aiServiceProviders_create(
  connection: api.IConnection,
) {
  const output: ICommunityAiAiServiceProvider =
    await api.functional.communityAi.admin.aiServiceProviders.create(
      connection,
      {
        body: typia.random<ICommunityAiAiServiceProvider.ICreate>(),
      },
    );
  typia.assert(output);
}
