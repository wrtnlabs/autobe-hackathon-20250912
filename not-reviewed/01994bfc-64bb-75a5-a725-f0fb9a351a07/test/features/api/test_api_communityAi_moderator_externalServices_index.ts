import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiExternalService } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiExternalService";
import { ICommunityAiExternalService } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiExternalService";

export async function test_api_communityAi_moderator_externalServices_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiExternalService.ISummary =
    await api.functional.communityAi.moderator.externalServices.index(
      connection,
      {
        body: typia.random<ICommunityAiExternalService.IRequest>(),
      },
    );
  typia.assert(output);
}
