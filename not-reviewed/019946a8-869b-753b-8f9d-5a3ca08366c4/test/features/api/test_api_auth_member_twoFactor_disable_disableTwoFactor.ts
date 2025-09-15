import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordMember";

export async function test_api_auth_member_twoFactor_disable_disableTwoFactor(
  connection: api.IConnection,
) {
  const output: ITravelRecordMember.IResult =
    await api.functional.auth.member.twoFactor.disable.disableTwoFactor(
      connection,
      {
        body: typia.random<ITravelRecordMember.IDisableTwoFactor>(),
      },
    );
  typia.assert(output);
}
