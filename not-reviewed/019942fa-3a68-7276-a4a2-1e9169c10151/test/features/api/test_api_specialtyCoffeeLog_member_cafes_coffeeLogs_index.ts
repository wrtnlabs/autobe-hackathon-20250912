import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageISpecialtyCoffeeLogCoffeeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISpecialtyCoffeeLogCoffeeLog";
import { ISpecialtyCoffeeLogCoffeeLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogCoffeeLogs";

export async function test_api_specialtyCoffeeLog_member_cafes_coffeeLogs_index(
  connection: api.IConnection,
) {
  const output: IPageISpecialtyCoffeeLogCoffeeLog.ISummary =
    await api.functional.specialtyCoffeeLog.member.cafes.coffeeLogs.index(
      connection,
      {
        cafeId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ISpecialtyCoffeeLogCoffeeLogs.IRequest>(),
      },
    );
  typia.assert(output);
}
