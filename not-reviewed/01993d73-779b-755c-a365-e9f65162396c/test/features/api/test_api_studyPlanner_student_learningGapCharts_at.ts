import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerLearningGapCharts } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerLearningGapCharts";

export async function test_api_studyPlanner_student_learningGapCharts_at(
  connection: api.IConnection,
) {
  const output: IStudyPlannerLearningGapCharts =
    await api.functional.studyPlanner.student.learningGapCharts.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
