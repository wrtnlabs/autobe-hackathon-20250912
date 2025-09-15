import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_travelRecord_member_places_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.travelRecord.member.places.erase(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
