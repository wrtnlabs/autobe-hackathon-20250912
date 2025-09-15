import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyPlannerMemoArray } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPlannerMemoArray";

export async function test_api_studyPlanner_student_studyTasks_memos_indexMemos(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyPlannerMemoArray =
    await api.functional.studyPlanner.student.studyTasks.memos.indexMemos(
      connection,
      {
        studyTaskId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
