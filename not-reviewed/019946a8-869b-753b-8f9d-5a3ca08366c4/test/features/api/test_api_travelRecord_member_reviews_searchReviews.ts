import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageITravelRecordReviews } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITravelRecordReviews";
import { ITravelRecordReviews } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordReviews";

export async function test_api_travelRecord_member_reviews_searchReviews(
  connection: api.IConnection,
) {
  const output: IPageITravelRecordReviews.ISummary =
    await api.functional.travelRecord.member.reviews.searchReviews(connection, {
      body: typia.random<ITravelRecordReviews.IRequest>(),
    });
  typia.assert(output);
}
