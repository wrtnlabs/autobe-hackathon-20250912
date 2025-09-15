import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISpecialtyCoffeeLogCafe } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogCafe";

export async function test_api_specialtyCoffeeLog_cafes_at(
  connection: api.IConnection,
) {
  const output: ISpecialtyCoffeeLogCafe =
    await api.functional.specialtyCoffeeLog.cafes.at(connection, {
      cafeId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
