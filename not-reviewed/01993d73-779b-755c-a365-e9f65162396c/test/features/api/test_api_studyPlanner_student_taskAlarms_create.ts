import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IStudyPlannerTaskAlarm } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerTaskAlarm";

export async function test_api_studyPlanner_student_taskAlarms_create(
  connection: api.IConnection,
) {
  const output: IStudyPlannerTaskAlarm =
    await api.functional.studyPlanner.student.taskAlarms.create(connection, {
      body: typia.random<IStudyPlannerTaskAlarm.ICreate>(),
    });
  typia.assert(output);
}
