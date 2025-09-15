import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISpecialtyCoffeeLogCoffeeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogCoffeeLog";

export async function test_api_specialtyCoffeeLog_member_cafes_coffeeLogs_at(
  connection: api.IConnection,
) {
  const output: ISpecialtyCoffeeLogCoffeeLog =
    await api.functional.specialtyCoffeeLog.member.cafes.coffeeLogs.at(
      connection,
      {
        cafeId: typia.random<string & tags.Format<"uuid">>(),
        coffeeLogId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
