import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test successful fetching of manager details by ID as an authenticated
 * manager user.
 *
 * This test covers the complete flow:
 *
 * 1. Create a new manager user with email, password, and name via the join API
 *    endpoint.
 * 2. Confirm joining returns authorization tokens and manager details.
 * 3. Retrieve manager details by ID using the exact ID from the join response,
 *    as an authenticated user.
 * 4. Validate the returned manager data matches the newly created manager's
 *    info completely.
 *
 * This validates the authentication lifecycle and permissions are
 * functioning correctly.
 */
export async function test_api_manager_retrieval_manager_role_success(
  connection: api.IConnection,
) {
  // 1. Create a new manager user via join API
  const createBody = {
    email: RandomGenerator.alphaNumeric(8) + "@testcompany.com",
    password: "SecurePass123!",
    name: RandomGenerator.name(2),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const joined: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, { body: createBody });
  typia.assert(joined);

  // 2. Use the manager's own ID to fetch details
  const fetched: IJobPerformanceEvalManager =
    await api.functional.jobPerformanceEval.manager.managers.at(connection, {
      id: joined.id,
    });
  typia.assert(fetched);

  // Validate fields
  TestValidator.equals("manager id equality", fetched.id, joined.id);
  TestValidator.equals("manager email equality", fetched.email, joined.email);
  TestValidator.equals("manager name equality", fetched.name, joined.name);
  TestValidator.equals(
    "manager password_hash equality",
    fetched.password_hash,
    joined.password_hash,
  );
  TestValidator.equals(
    "manager created_at equality",
    fetched.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "manager updated_at equality",
    fetched.updated_at,
    joined.updated_at,
  );

  // nullable deleted_at: use explicit null if joined deleted_at is null or undefined
  TestValidator.equals(
    "manager deleted_at equality",
    fetched.deleted_at ?? null,
    joined.deleted_at ?? null,
  );
}
