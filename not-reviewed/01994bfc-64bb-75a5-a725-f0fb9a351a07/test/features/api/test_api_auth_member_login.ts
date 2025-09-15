import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiMember";

export async function test_api_auth_member_login(connection: api.IConnection) {
  const output: ICommunityAiMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: typia.random<ICommunityAiMember.ILogin>(),
    });
  typia.assert(output);
}
