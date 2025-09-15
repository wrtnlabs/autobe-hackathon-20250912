import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_studyPlanner_student_studyTasks_attachments_eraseAttachment(
  connection: api.IConnection,
) {
  const output =
    await api.functional.studyPlanner.student.studyTasks.attachments.eraseAttachment(
      connection,
      {
        studyTaskId: typia.random<string & tags.Format<"uuid">>(),
        attachmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
