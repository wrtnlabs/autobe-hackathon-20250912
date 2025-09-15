import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommunityAiMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAiMember";
import { ICommunityAiMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiMember";

export async function test_api_communityAi_member_members_index(
  connection: api.IConnection,
) {
  const output: IPageICommunityAiMember.ISummary =
    await api.functional.communityAi.member.members.index(connection, {
      body: typia.random<ICommunityAiMember.IRequest>(),
    });
  typia.assert(output);
}
