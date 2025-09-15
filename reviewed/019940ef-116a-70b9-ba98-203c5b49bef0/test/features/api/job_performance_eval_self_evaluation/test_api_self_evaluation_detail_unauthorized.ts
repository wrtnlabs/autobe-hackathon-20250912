import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

/**
 * Validate that accessing the self-evaluation detail endpoint without proper
 * authentication or with invalid authorization context is denied.
 *
 * This test function performs the following steps:
 *
 * 1. Perform employee join to establish proper authentication context.
 * 2. Attempt retrieval of self-evaluation detail without any authentication.
 * 3. Attempt retrieval with tampered (invalid) authentication token.
 * 4. Attempt retrieval using a fresh connection without login.
 *
 * All unauthorized attempts must result in error, validating proper access
 * controls and security enforcement on the API endpoint.
 */
export async function test_api_self_evaluation_detail_unauthorized(
  connection: api.IConnection,
) {
  // 1. Join employee to establish baseline authentication context
  const joinBody = {
    email: `test${Date.now()}@example.com`,
    password_hash: "hashedpassword",
    name: "Test Employee",
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const authorizedEmployee =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: joinBody,
    });
  typia.assert(authorizedEmployee);

  // 2. Attempt to access self-evaluation detail without any authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "access self-evaluation detail without authentication should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.selfEvaluations.atSelfEvaluation(
        unauthenticatedConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 3. Attempt to access self-evaluation detail with tampered invalid token
  const tamperedConnection: api.IConnection = { ...connection };
  tamperedConnection.headers = { Authorization: "Bearer invalidtoken" };
  await TestValidator.error(
    "access self-evaluation detail with invalid token should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.selfEvaluations.atSelfEvaluation(
        tamperedConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 4. Attempt to access self-evaluation detail with fresh connection no login
  const freshConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "access self-evaluation detail without login should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.selfEvaluations.atSelfEvaluation(
        freshConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
