import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISpecialtyCoffeeLogCafe } from "@ORGANIZATION/PROJECT-api/lib/structures/ISpecialtyCoffeeLogCafe";

export async function test_api_specialtyCoffeeLog_member_cafes_update(
  connection: api.IConnection,
) {
  const output: ISpecialtyCoffeeLogCafe =
    await api.functional.specialtyCoffeeLog.member.cafes.update(connection, {
      cafeId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ISpecialtyCoffeeLogCafe.IUpdate>(),
    });
  typia.assert(output);
}
