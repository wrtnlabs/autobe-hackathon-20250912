import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIStudyPlannerSubjectCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStudyPlannerSubjectCategories";
import { IStudyPlannerSubjectCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerSubjectCategories";

export async function test_api_studyPlanner_student_subjectCategories_index(
  connection: api.IConnection,
) {
  const output: IPageIStudyPlannerSubjectCategories.ISummary =
    await api.functional.studyPlanner.student.subjectCategories.index(
      connection,
      {
        body: typia.random<IStudyPlannerSubjectCategories.IRequest>(),
      },
    );
  typia.assert(output);
}
