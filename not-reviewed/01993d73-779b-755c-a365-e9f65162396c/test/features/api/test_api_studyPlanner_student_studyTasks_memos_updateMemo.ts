import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyPlannerMemos } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPlannerMemos";

export async function test_api_studyPlanner_student_studyTasks_memos_updateMemo(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyPlannerMemos =
    await api.functional.studyPlanner.student.studyTasks.memos.updateMemo(
      connection,
      {
        studyTaskId: typia.random<string & tags.Format<"uuid">>(),
        memoId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IStudyPlannerStudyPlannerMemos.IUpdate>(),
      },
    );
  typia.assert(output);
}
