import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IStudyPlannerGeneralReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerGeneralReminder";

export async function test_api_studyPlanner_student_generalReminders_create(
  connection: api.IConnection,
) {
  const output: IStudyPlannerGeneralReminder =
    await api.functional.studyPlanner.student.generalReminders.create(
      connection,
      {
        body: typia.random<IStudyPlannerGeneralReminder.ICreate>(),
      },
    );
  typia.assert(output);
}
