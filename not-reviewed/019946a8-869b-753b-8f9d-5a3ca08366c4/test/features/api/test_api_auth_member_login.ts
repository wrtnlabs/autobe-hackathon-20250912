import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordMember";

export async function test_api_auth_member_login(connection: api.IConnection) {
  const output: ITravelRecordMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: typia.random<ITravelRecordMember.ILogin>(),
    });
  typia.assert(output);
}
