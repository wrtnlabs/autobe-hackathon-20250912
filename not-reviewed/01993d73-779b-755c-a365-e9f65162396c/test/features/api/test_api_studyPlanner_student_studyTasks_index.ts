import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIStudyPlannerStudyTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStudyPlannerStudyTasks";
import { IStudyPlannerStudyTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyTasks";

export async function test_api_studyPlanner_student_studyTasks_index(
  connection: api.IConnection,
) {
  const output: IPageIStudyPlannerStudyTasks.ISummary =
    await api.functional.studyPlanner.student.studyTasks.index(connection, {
      body: typia.random<IStudyPlannerStudyTasks.IRequest>(),
    });
  typia.assert(output);
}
