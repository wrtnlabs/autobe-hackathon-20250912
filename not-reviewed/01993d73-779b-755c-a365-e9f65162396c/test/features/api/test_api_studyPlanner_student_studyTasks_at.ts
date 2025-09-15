import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyTasks";

export async function test_api_studyPlanner_student_studyTasks_at(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyTasks =
    await api.functional.studyPlanner.student.studyTasks.at(connection, {
      studyTaskId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
