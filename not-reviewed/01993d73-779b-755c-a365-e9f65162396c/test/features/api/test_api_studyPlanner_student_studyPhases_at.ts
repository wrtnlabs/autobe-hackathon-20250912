import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudyPhases } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPhases";

export async function test_api_studyPlanner_student_studyPhases_at(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudyPhases =
    await api.functional.studyPlanner.student.studyPhases.at(connection, {
      studyPhaseId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
