import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IStudyPlannerStudyPhases } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPhases";

export async function test_api_studyPlanner_student_studyPhases_create(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyPhases =
    await api.functional.studyPlanner.student.studyPhases.create(connection, {
      body: typia.random<IStudyPlannerStudyPhases.ICreate>(),
    });
  typia.assert(output);
}
