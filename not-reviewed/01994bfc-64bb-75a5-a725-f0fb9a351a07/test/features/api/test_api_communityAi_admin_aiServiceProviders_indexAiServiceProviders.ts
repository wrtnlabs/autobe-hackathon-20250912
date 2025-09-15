import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiAiServiceProviders } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiAiServiceProviders";
import { ICommunityAiAiServiceProviders } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAiServiceProviders";

export async function test_api_communityAi_admin_aiServiceProviders_indexAiServiceProviders(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiAiServiceProviders =
    await api.functional.communityAi.admin.aiServiceProviders.indexAiServiceProviders(
      connection,
      {
        body: typia.random<ICommunityAiAiServiceProviders.IRequest>(),
      },
    );
  typia.assert(output);
}
