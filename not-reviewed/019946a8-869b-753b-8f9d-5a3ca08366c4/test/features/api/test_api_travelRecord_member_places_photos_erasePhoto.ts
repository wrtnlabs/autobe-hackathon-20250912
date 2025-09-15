import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_travelRecord_member_places_photos_erasePhoto(
  connection: api.IConnection,
) {
  const output =
    await api.functional.travelRecord.member.places.photos.erasePhoto(
      connection,
      {
        travelRecordPlaceId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
