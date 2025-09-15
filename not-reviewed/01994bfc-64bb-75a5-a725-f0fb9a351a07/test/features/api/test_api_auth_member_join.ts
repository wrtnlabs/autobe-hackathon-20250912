import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiMember";

export async function test_api_auth_member_join(connection: api.IConnection) {
  const output: ICommunityAiMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: typia.random<ICommunityAiMember.ICreate>(),
    });
  typia.assert(output);
}
