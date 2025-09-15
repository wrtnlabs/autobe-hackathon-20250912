import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerAttachment";

export async function test_api_studyPlanner_student_studyTasks_attachments_create(
  connection: api.IConnection,
) {
  const output: IStudyPlannerAttachment =
    await api.functional.studyPlanner.student.studyTasks.attachments.create(
      connection,
      {
        studyTaskId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IStudyPlannerAttachment.ICreate>(),
      },
    );
  typia.assert(output);
}
