import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_studyPlanner_student_students_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.studyPlanner.student.students.erase(
    connection,
    {
      studentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
