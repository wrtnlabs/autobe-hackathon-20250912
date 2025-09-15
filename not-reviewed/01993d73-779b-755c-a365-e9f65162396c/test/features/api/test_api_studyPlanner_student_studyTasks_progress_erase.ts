import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_studyPlanner_student_studyTasks_progress_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.studyPlanner.student.studyTasks.progress.erase(
      connection,
      {
        studyTaskId: typia.random<string & tags.Format<"uuid">>(),
        progressId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
