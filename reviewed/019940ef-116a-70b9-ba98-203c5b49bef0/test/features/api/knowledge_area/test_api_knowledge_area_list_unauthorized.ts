import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalKnowledgeArea } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalKnowledgeArea";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalKnowledgeArea } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalKnowledgeArea";

/**
 * Verify that unauthorized access to knowledge areas listing is properly
 * rejected.
 *
 * This test ensures security by verifying that the PATCH
 * /jobPerformanceEval/employee/knowledgeAreas endpoint rejects unauthenticated
 * requests with an unauthorized error.
 *
 * The test first registers a new employee user via POST /auth/employee/join to
 * have a valid authentication context, then it clears authentication headers to
 * simulate an unauthenticated request.
 *
 * Finally, it attempts to retrieve knowledge areas without authentication and
 * expects an error, confirming enforcement of access control.
 */
export async function test_api_knowledge_area_list_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register a new employee user
  const employeeCreateData =
    typia.random<IJobPerformanceEvalEmployee.ICreate>();
  const employeeAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateData,
    });
  typia.assert(employeeAuthorized);

  // 2. Create unauthenticated connection by clearing headers
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt to call knowledge areas listing endpoint without auth
  await TestValidator.error(
    "unauthorized access to knowledge areas should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.knowledgeAreas.index(
        unauthenticatedConn,
        {
          body: {},
        },
      );
    },
  );
}
