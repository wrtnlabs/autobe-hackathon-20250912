import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformMember";

export async function test_api_auth_member_refresh(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: typia.random<IAuctionPlatformMember.IRefresh>(),
    });
  typia.assert(output);
}
