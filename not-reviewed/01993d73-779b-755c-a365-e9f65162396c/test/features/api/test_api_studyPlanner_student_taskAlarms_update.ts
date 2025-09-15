import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerTaskAlarm } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerTaskAlarm";

export async function test_api_studyPlanner_student_taskAlarms_update(
  connection: api.IConnection,
) {
  const output: IStudyPlannerTaskAlarm =
    await api.functional.studyPlanner.student.taskAlarms.update(connection, {
      taskAlarmId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IStudyPlannerTaskAlarm.IUpdate>(),
    });
  typia.assert(output);
}
