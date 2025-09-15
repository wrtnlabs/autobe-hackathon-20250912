import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiModerator";
import { ICommunityAiModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiModerator";

export async function test_api_communityAi_admin_moderators_indexModerators(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiModerator.ISummary =
    await api.functional.communityAi.admin.moderators.indexModerators(
      connection,
      {
        body: typia.random<ICommunityAiModerator.IRequest>(),
      },
    );
  typia.assert(output);
}
