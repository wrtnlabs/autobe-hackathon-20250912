import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyPlannerMemo } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPlannerMemo";

export async function test_api_studyPlanner_student_studyTasks_memos_atMemo(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyPlannerMemo =
    await api.functional.studyPlanner.student.studyTasks.memos.atMemo(
      connection,
      {
        studyTaskId: typia.random<string & tags.Format<"uuid">>(),
        memoId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
