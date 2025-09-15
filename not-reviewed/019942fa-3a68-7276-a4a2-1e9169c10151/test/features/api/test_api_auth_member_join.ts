import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISpecialtyCoffeeLogMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogMember";

export async function test_api_auth_member_join(connection: api.IConnection) {
  const output: ISpecialtyCoffeeLogMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: typia.random<ISpecialtyCoffeeLogMember.ICreate>(),
    });
  typia.assert(output);
}
