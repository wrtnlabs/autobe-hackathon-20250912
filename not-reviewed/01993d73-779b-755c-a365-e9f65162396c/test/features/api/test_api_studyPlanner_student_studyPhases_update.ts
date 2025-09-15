import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyPhases } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPhases";

export async function test_api_studyPlanner_student_studyPhases_update(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyPhases =
    await api.functional.studyPlanner.student.studyPhases.update(connection, {
      studyPhaseId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IStudyPlannerStudyPhases.IUpdate>(),
    });
  typia.assert(output);
}
