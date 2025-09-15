import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISpecialtyCoffeeLogCafe } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogCafe";

export async function test_api_specialtyCoffeeLog_member_cafes_create(
  connection: api.IConnection,
) {
  const output: ISpecialtyCoffeeLogCafe =
    await api.functional.specialtyCoffeeLog.member.cafes.create(connection, {
      body: typia.random<ISpecialtyCoffeeLogCafe.ICreate>(),
    });
  typia.assert(output);
}
