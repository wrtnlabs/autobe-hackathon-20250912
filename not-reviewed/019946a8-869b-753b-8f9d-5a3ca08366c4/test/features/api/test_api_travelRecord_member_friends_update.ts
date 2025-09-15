import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordFriend } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordFriend";

export async function test_api_travelRecord_member_friends_update(
  connection: api.IConnection,
) {
  const output: ITravelRecordFriend =
    await api.functional.travelRecord.member.friends.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ITravelRecordFriend.IUpdate>(),
    });
  typia.assert(output);
}
