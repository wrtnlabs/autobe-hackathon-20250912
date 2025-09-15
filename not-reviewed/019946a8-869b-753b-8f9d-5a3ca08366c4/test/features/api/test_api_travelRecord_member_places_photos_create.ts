import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordPlacePhoto } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPlacePhoto";

export async function test_api_travelRecord_member_places_photos_create(
  connection: api.IConnection,
) {
  const output: ITravelRecordPlacePhoto =
    await api.functional.travelRecord.member.places.photos.create(connection, {
      travelRecordPlaceId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ITravelRecordPlacePhoto.ICreate>(),
    });
  typia.assert(output);
}
