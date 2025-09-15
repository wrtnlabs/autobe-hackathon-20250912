import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IStudyPlannerStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudent";

export async function test_api_studyPlanner_student_students_at(
  connection: api.IConnection,
) {
  const output: IStudyPlannerStudent =
    await api.functional.studyPlanner.student.students.at(connection, {
      studentId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
