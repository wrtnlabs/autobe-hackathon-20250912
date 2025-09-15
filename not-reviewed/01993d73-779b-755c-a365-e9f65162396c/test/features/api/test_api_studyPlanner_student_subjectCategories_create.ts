import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IStudyPlannerSubjectCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerSubjectCategories";

export async function test_api_studyPlanner_student_subjectCategories_create(
  connection: api.IConnection,
) {
  const output: IStudyPlannerSubjectCategories =
    await api.functional.studyPlanner.student.subjectCategories.create(
      connection,
      {
        body: typia.random<IStudyPlannerSubjectCategories.ICreate>(),
      },
    );
  typia.assert(output);
}
