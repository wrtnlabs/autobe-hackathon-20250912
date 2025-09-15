import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageITravelRecordPlaces } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITravelRecordPlaces";
import { ITravelRecordPlaces } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPlaces";

export async function test_api_travelRecord_member_places_index(
  connection: api.IConnection,
) {
  const output: IPageITravelRecordPlaces.ISummary =
    await api.functional.travelRecord.member.places.index(connection, {
      body: typia.random<ITravelRecordPlaces.IRequest>(),
    });
  typia.assert(output);
}
