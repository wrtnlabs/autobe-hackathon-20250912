import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformMember";

export async function test_api_auth_member_join(connection: api.IConnection) {
  const output: IAuctionPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: typia.random<IAuctionPlatformMember.ICreate>(),
    });
  typia.assert(output);
}
