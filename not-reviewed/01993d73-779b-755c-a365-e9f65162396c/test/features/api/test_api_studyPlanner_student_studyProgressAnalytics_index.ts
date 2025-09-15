import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIStudyPlannerStudyProgressAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStudyPlannerStudyProgressAnalytics";
import { IStudyPlannerStudyProgressAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyProgressAnalytics";

export async function test_api_studyPlanner_student_studyProgressAnalytics_index(
  connection: api.IConnection,
) {
  const output: IPageIStudyPlannerStudyProgressAnalytics =
    await api.functional.studyPlanner.student.studyProgressAnalytics.index(
      connection,
      {
        body: typia.random<IStudyPlannerStudyProgressAnalytics.IRequest>(),
      },
    );
  typia.assert(output);
}
