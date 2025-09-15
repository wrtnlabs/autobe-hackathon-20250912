import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIStudyPlannerAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStudyPlannerAttachment";

export async function test_api_studyPlanner_student_studyTasks_attachments_index(
  connection: api.IConnection,
) {
  const output: IPageIStudyPlannerAttachment.ISummary =
    await api.functional.studyPlanner.student.studyTasks.attachments.index(
      connection,
      {
        studyTaskId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
