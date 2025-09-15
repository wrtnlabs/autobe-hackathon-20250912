import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordMember";

export async function test_api_auth_member_twoFactor_enable_enableTwoFactor(
  connection: api.IConnection,
) {
  const output: ITravelRecordMember.IResult =
    await api.functional.auth.member.twoFactor.enable.enableTwoFactor(
      connection,
      {
        body: typia.random<ITravelRecordMember.IEnableTwoFactor>(),
      },
    );
  typia.assert(output);
}
