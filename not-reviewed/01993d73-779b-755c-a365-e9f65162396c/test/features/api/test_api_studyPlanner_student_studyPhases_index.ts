import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIStudyPlannerStudyPhases } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStudyPlannerStudyPhases";
import { IStudyPlannerStudyPhases } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPhases";

export async function test_api_studyPlanner_student_studyPhases_index(
  connection: api.IConnection,
) {
  const output: IPageIStudyPlannerStudyPhases.ISummary =
    await api.functional.studyPlanner.student.studyPhases.index(connection, {
      body: typia.random<IStudyPlannerStudyPhases.IRequest>(),
    });
  typia.assert(output);
}
