import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordMember";

export async function test_api_auth_member_email_verify_confirm_verifyEmailConfirm(
  connection: api.IConnection,
) {
  const output: ITravelRecordMember.IResult =
    await api.functional.auth.member.email.verify.confirm.verifyEmailConfirm(
      connection,
      {
        body: typia.random<ITravelRecordMember.IVerifyConfirm>(),
      },
    );
  typia.assert(output);
}
