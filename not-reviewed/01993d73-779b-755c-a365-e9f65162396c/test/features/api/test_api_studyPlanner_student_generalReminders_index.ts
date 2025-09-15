import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIStudyPlannerGeneralReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStudyPlannerGeneralReminder";
import { IStudyPlannerGeneralReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerGeneralReminder";

export async function test_api_studyPlanner_student_generalReminders_index(
  connection: api.IConnection,
) {
  const output: IPageIStudyPlannerGeneralReminder.ISummary =
    await api.functional.studyPlanner.student.generalReminders.index(
      connection,
      {
        body: typia.random<IStudyPlannerGeneralReminder.IRequest>(),
      },
    );
  typia.assert(output);
}
