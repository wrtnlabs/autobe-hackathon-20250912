import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiContentFlag";
import { ICommunityAiContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiContentFlag";

export async function test_api_communityAi_moderator_contentFlags_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiContentFlag.ISummary =
    await api.functional.communityAi.moderator.contentFlags.index(connection, {
      body: typia.random<ICommunityAiContentFlag.IRequest>(),
    });
  typia.assert(output);
}
