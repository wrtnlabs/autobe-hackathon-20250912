import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISpecialtyCoffeeLogCoffeeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogCoffeeLog";

export async function test_api_specialtyCoffeeLog_member_cafes_coffeeLogs_create(
  connection: api.IConnection,
) {
  const output: ISpecialtyCoffeeLogCoffeeLog =
    await api.functional.specialtyCoffeeLog.member.cafes.coffeeLogs.create(
      connection,
      {
        cafeId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ISpecialtyCoffeeLogCoffeeLog.ICreate>(),
      },
    );
  typia.assert(output);
}
