import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordPlaces } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPlaces";

export async function test_api_travelRecord_member_places_create(
  connection: api.IConnection,
) {
  const output: ITravelRecordPlaces =
    await api.functional.travelRecord.member.places.create(connection, {
      body: typia.random<ITravelRecordPlaces.ICreate>(),
    });
  typia.assert(output);
}
