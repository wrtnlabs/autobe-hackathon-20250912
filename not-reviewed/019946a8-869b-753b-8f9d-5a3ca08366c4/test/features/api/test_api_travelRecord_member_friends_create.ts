import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordFriend } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordFriend";

export async function test_api_travelRecord_member_friends_create(
  connection: api.IConnection,
) {
  const output: ITravelRecordFriend =
    await api.functional.travelRecord.member.friends.create(connection, {
      body: typia.random<ITravelRecordFriend.ICreate>(),
    });
  typia.assert(output);
}
