import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordMember";

export async function test_api_auth_member_join(connection: api.IConnection) {
  const output: ITravelRecordMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: typia.random<ITravelRecordMember.ICreate>(),
    });
  typia.assert(output);
}
