import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyProgressAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyProgressAnalytics";

export async function test_api_studyPlanner_student_studyProgressAnalytics_at(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyProgressAnalytics =
    await api.functional.studyPlanner.student.studyProgressAnalytics.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
