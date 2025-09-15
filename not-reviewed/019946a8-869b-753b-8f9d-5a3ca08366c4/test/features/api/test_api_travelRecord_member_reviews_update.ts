import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordReview";

export async function test_api_travelRecord_member_reviews_update(
  connection: api.IConnection,
) {
  const output: ITravelRecordReview =
    await api.functional.travelRecord.member.reviews.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ITravelRecordReview.IUpdate>(),
    });
  typia.assert(output);
}
