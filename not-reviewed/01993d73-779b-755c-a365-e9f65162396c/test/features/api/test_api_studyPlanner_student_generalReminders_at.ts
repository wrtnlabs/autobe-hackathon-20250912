import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerGeneralReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerGeneralReminder";

export async function test_api_studyPlanner_student_generalReminders_at(
  connection: api.IConnection,
) {
  const output: IStudyPlannerGeneralReminder =
    await api.functional.studyPlanner.student.generalReminders.at(connection, {
      generalReminderId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
