import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerSubjectCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerSubjectCategories";

export async function test_api_studyPlanner_student_subjectCategories_update(
  connection: api.IConnection,
) {
  const output =
    await api.functional.studyPlanner.student.subjectCategories.update(
      connection,
      {
        subjectCategoryId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IStudyPlannerSubjectCategories.IUpdate>(),
      },
    );
  typia.assert(output);
}
