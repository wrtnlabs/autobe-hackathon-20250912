import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageICommunityAiUserSessionJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiUserSessionJwtToken";
import { ICommunityAiUserSessionJwtTokens } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiUserSessionJwtTokens";

export async function test_api_communityAi_member_userSessions_jwtTokens_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiUserSessionJwtToken =
    await api.functional.communityAi.member.userSessions.jwtTokens.index(
      connection,
      {
        userSessionId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ICommunityAiUserSessionJwtTokens.IRequest>(),
      },
    );
  typia.assert(output);
}
