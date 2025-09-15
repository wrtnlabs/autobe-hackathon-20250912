import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordReviews } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordReviews";

export async function test_api_travelRecord_member_reviews_atReview(
  connection: api.IConnection,
) {
  const output: ITravelRecordReviews =
    await api.functional.travelRecord.member.reviews.atReview(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
