import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISpecialtyCoffeeLogMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogMember";

export async function test_api_auth_member_refresh(
  connection: api.IConnection,
) {
  const output: ISpecialtyCoffeeLogMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: typia.random<ISpecialtyCoffeeLogMember.IRefresh>(),
    });
  typia.assert(output);
}
