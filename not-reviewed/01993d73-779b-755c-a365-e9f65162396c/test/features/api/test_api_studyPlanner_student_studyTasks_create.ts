import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IStudyPlannerStudyTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyTask";

export async function test_api_studyPlanner_student_studyTasks_create(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyTask =
    await api.functional.studyPlanner.student.studyTasks.create(connection, {
      studyTaskId: typia.random<string>(),
      body: typia.random<IStudyPlannerStudyTask.ICreate>(),
    });
  typia.assert(output);
}
