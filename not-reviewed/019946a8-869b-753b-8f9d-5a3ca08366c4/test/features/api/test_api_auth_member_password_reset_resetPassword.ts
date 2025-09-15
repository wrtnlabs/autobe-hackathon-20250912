import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordMember";

export async function test_api_auth_member_password_reset_resetPassword(
  connection: api.IConnection,
) {
  const output: ITravelRecordMember.IResult =
    await api.functional.auth.member.password.reset.resetPassword(connection, {
      body: typia.random<ITravelRecordMember.IResetPassword>(),
    });
  typia.assert(output);
}
