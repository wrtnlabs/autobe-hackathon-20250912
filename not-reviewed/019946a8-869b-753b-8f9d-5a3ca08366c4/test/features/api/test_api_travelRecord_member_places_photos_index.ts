import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageITravelRecordPlacePhoto } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITravelRecordPlacePhoto";
import { ITravelRecordPlacePhoto } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPlacePhoto";

export async function test_api_travelRecord_member_places_photos_index(
  connection: api.IConnection,
) {
  const output: IPageITravelRecordPlacePhoto.ISummary =
    await api.functional.travelRecord.member.places.photos.index(connection, {
      travelRecordPlaceId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ITravelRecordPlacePhoto.IRequest>(),
    });
  typia.assert(output);
}
