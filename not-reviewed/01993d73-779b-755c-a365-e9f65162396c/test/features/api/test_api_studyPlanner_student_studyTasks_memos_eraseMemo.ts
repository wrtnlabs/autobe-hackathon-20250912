import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_studyPlanner_student_studyTasks_memos_eraseMemo(
  connection: api.IConnection,
) {
  const output =
    await api.functional.studyPlanner.student.studyTasks.memos.eraseMemo(
      connection,
      {
        studyTaskId: typia.random<string & tags.Format<"uuid">>(),
        memoId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
