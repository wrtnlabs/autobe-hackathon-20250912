import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIStudyPlannerLearningGapCharts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStudyPlannerLearningGapCharts";
import { IStudyPlannerLearningGapCharts } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerLearningGapCharts";

export async function test_api_studyPlanner_student_learningGapCharts_index(
  connection: api.IConnection,
) {
  const output: IPageIStudyPlannerLearningGapCharts =
    await api.functional.studyPlanner.student.learningGapCharts.index(
      connection,
      {
        body: typia.random<IStudyPlannerLearningGapCharts.IRequest>(),
      },
    );
  typia.assert(output);
}
