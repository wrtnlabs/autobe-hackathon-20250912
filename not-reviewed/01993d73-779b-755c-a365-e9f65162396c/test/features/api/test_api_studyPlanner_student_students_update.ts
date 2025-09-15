import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudent";

export async function test_api_studyPlanner_student_students_update(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudent =
    await api.functional.studyPlanner.student.students.update(connection, {
      studentId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IStudyPlannerStudent.IUpdate>(),
    });
  typia.assert(output);
}
