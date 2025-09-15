import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIStudyPlannerStudyPlannerTaskAlarms } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStudyPlannerStudyPlannerTaskAlarms";
import { IStudyPlannerStudyPlannerTaskAlarms } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudyPlannerTaskAlarms";

export async function test_api_studyPlanner_student_taskAlarms_searchTaskAlarms(
  connection: api.IConnection,
) {
  const output: IPageIStudyPlannerStudyPlannerTaskAlarms.ISummary =
    await api.functional.studyPlanner.student.taskAlarms.searchTaskAlarms(
      connection,
      {
        body: typia.random<IStudyPlannerStudyPlannerTaskAlarms.IRequest>(),
      },
    );
  typia.assert(output);
}
