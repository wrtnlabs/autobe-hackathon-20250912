import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordPlaces } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPlaces";

export async function test_api_travelRecord_member_places_at(
  connection: api.IConnection,
) {
  const output: ITravelRecordPlaces =
    await api.functional.travelRecord.member.places.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
