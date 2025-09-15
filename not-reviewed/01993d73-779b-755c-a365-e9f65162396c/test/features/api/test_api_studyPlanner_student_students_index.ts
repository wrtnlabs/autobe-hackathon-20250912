import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIStudyPlannerStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStudyPlannerStudent";
import { IStudyPlannerStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudent";

export async function test_api_studyPlanner_student_students_index(
  connection: api.IConnection,
) {
  const output: IPageIStudyPlannerStudent.ISummary =
    await api.functional.studyPlanner.student.students.index(connection, {
      body: typia.random<IStudyPlannerStudent.IRequest>(),
    });
  typia.assert(output);
}
