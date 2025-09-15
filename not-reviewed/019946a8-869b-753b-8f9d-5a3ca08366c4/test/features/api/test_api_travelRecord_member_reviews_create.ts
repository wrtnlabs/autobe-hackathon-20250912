import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordReview";

export async function test_api_travelRecord_member_reviews_create(
  connection: api.IConnection,
) {
  const output: ITravelRecordReview =
    await api.functional.travelRecord.member.reviews.create(connection, {
      body: typia.random<ITravelRecordReview.ICreate>(),
    });
  typia.assert(output);
}
