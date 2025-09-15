import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyTaskProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyTaskProgress";

export async function test_api_studyPlanner_student_studyTasks_progress_create(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyTaskProgress =
    await api.functional.studyPlanner.student.studyTasks.progress.create(
      connection,
      {
        studyTaskId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IStudyPlannerStudyTaskProgress.ICreate>(),
      },
    );
  typia.assert(output);
}
