import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyTask";

export async function test_api_studyPlanner_student_studyTasks_update(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyTask =
    await api.functional.studyPlanner.student.studyTasks.update(connection, {
      studyTaskId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IStudyPlannerStudyTask.IUpdate>(),
    });
  typia.assert(output);
}
