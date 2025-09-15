import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * This test creates a manager user, logs in, then retrieves a job group detail
 * by a valid id.
 *
 * Business flow:
 *
 * 1. Create a manager user with random email, secure password, and random name.
 * 2. Login the manager using the created credentials, acquiring JWT tokens.
 * 3. Retrieve a job group using a valid randomly generated UUID.
 * 4. Validate key job group properties for correct type and value conformity.
 */
export async function test_api_job_group_retrieve_valid_id(
  connection: api.IConnection,
) {
  // Step 1: Manager user creation
  const managerCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "SecurePass123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const authorizedManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(authorizedManager);

  // Step 2: Manager user login
  const managerLoginBody = {
    email: managerCreateBody.email,
    password: managerCreateBody.password,
  } satisfies IJobPerformanceEvalManager.ILogin;

  const loginManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.login(connection, {
      body: managerLoginBody,
    });
  typia.assert(loginManager);

  // Step 3: Job group retrieval by valid UUID
  const jobGroupId = typia.random<string & tags.Format<"uuid">>();

  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.at(connection, {
      id: jobGroupId,
    });
  typia.assert(jobGroup);

  // Step 4: Validate core properties of the job group
  TestValidator.predicate(
    "job group code is non-empty string",
    typeof jobGroup.code === "string" && jobGroup.code.length > 0,
  );
  TestValidator.predicate(
    "job group name is non-empty string",
    typeof jobGroup.name === "string" && jobGroup.name.length > 0,
  );
  TestValidator.predicate(
    "job group created_at is ISO 8601 string",
    typeof jobGroup.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(jobGroup.created_at),
  );
  TestValidator.predicate(
    "job group updated_at is ISO 8601 string",
    typeof jobGroup.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(jobGroup.updated_at),
  );
}
