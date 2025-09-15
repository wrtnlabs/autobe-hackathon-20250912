import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordPhotos } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPhotos";

export async function test_api_travelRecord_member_places_photos_updatePhotoMetadata(
  connection: api.IConnection,
) {
  const output: ITravelRecordPhotos =
    await api.functional.travelRecord.member.places.photos.updatePhotoMetadata(
      connection,
      {
        travelRecordPlaceId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ITravelRecordPhotos.IUpdate>(),
      },
    );
  typia.assert(output);
}
