import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyPlannerMemo } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPlannerMemo";
import { IStudyPlannerStudyPlannerMemoICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPlannerMemoICreate";

export async function test_api_studyPlanner_student_studyTasks_memos_createMemo(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyPlannerMemo =
    await api.functional.studyPlanner.student.studyTasks.memos.createMemo(
      connection,
      {
        studyTaskId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IStudyPlannerStudyPlannerMemoICreate>(),
      },
    );
  typia.assert(output);
}
