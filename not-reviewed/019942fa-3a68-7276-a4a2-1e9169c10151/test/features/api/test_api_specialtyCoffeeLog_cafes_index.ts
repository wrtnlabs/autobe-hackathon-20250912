import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageISpecialtyCoffeeLogCafe } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISpecialtyCoffeeLogCafe";
import { ISpecialtyCoffeeLogCafe } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogCafe";

export async function test_api_specialtyCoffeeLog_cafes_index(
  connection: api.IConnection,
) {
  const output: IPageISpecialtyCoffeeLogCafe.ISummary =
    await api.functional.specialtyCoffeeLog.cafes.index(connection, {
      body: typia.random<ISpecialtyCoffeeLogCafe.IRequest>(),
    });
  typia.assert(output);
}
