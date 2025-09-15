import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordMember";

export async function test_api_auth_member_email_verify_send_sendEmailVerification(
  connection: api.IConnection,
) {
  const output: ITravelRecordMember.IResult =
    await api.functional.auth.member.email.verify.send.sendEmailVerification(
      connection,
      {
        body: typia.random<ITravelRecordMember.ISendVerification>(),
      },
    );
  typia.assert(output);
}
