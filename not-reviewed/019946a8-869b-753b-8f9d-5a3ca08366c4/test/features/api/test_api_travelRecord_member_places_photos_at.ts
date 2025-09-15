import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordPlacePhoto } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPlacePhoto";

export async function test_api_travelRecord_member_places_photos_at(
  connection: api.IConnection,
) {
  const output: ITravelRecordPlacePhoto =
    await api.functional.travelRecord.member.places.photos.at(connection, {
      travelRecordPlaceId: typia.random<string & tags.Format<"uuid">>(),
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
