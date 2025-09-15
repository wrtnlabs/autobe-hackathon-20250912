import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordPlaces } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPlaces";

export async function test_api_travelRecord_member_places_update(
  connection: api.IConnection,
) {
  const output: ITravelRecordPlaces =
    await api.functional.travelRecord.member.places.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ITravelRecordPlaces.IUpdate>(),
    });
  typia.assert(output);
}
