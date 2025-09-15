import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IStudyPlannerStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IStudyPlannerStudent";

export async function test_api_auth_student_login(connection: api.IConnection) {
  const output: IStudyPlannerStudent.IAuthorized =
    await api.functional.auth.student.login(connection, {
      body: typia.random<IStudyPlannerStudent.ILogin>(),
    });
  typia.assert(output);
}
