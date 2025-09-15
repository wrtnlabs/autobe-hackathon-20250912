import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyPlannerTaskAlarms } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPlannerTaskAlarms";

export async function test_api_studyPlanner_student_taskAlarms_atTaskAlarm(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyPlannerTaskAlarms =
    await api.functional.studyPlanner.student.taskAlarms.atTaskAlarm(
      connection,
      {
        taskAlarmId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
