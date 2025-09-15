import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordMember";

export async function test_api_auth_member_password_change_changePassword(
  connection: api.IConnection,
) {
  const output: ITravelRecordMember.IResult =
    await api.functional.auth.member.password.change.changePassword(
      connection,
      {
        body: typia.random<ITravelRecordMember.IChangePassword>(),
      },
    );
  typia.assert(output);
}
