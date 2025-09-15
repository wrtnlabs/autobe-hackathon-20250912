import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerSubjectCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerSubjectCategories";

export async function test_api_studyPlanner_student_subjectCategories_at(
  connection: api.IConnection,
) {
  const output: IStudyPlannerSubjectCategories =
    await api.functional.studyPlanner.student.subjectCategories.at(connection, {
      subjectCategoryId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
