import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageITravelRecordFriend } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITravelRecordFriend";
import { ITravelRecordFriend } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordFriend";

export async function test_api_travelRecord_member_friends_index(
  connection: api.IConnection,
) {
  const output: IPageITravelRecordFriend.ISummary =
    await api.functional.travelRecord.member.friends.index(connection, {
      body: typia.random<ITravelRecordFriend.IRequest>(),
    });
  typia.assert(output);
}
