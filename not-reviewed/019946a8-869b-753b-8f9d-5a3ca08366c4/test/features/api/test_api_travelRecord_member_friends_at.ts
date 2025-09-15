import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordFriend } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordFriend";

export async function test_api_travelRecord_member_friends_at(
  connection: api.IConnection,
) {
  const output: ITravelRecordFriend =
    await api.functional.travelRecord.member.friends.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
