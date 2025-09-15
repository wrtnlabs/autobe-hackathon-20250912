import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

/**
 * Test employee login success and failure scenarios.
 *
 * This E2E test validates the employee join API, ensuring successful
 * registration issues a valid authorized employee record including JWT tokens,
 * and that duplicate registration attempts correctly fail. It verifies all
 * required request and response properties with type-safe data and uses
 * realistic random values for credentials.
 */
export async function test_api_employee_login_success_and_failure(
  connection: api.IConnection,
) {
  // Prepare valid employee join data
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const name = RandomGenerator.name();

  const createBody = {
    email,
    password_hash: passwordHash,
    name,
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  // 1. Employee join - success case
  const authorized: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Validate response fields
  TestValidator.predicate(
    "authorized id is UUID format",
    typeof authorized.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        authorized.id,
      ),
  );

  TestValidator.equals("authorized email exact match", authorized.email, email);
  TestValidator.equals("authorized name exact match", authorized.name, name);

  // Validate that created_at and updated_at are strings in ISO 8601 format
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof authorized.created_at === "string" &&
      /^{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?Z$/.test(
        authorized.created_at,
      ),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof authorized.updated_at === "string" &&
      /^{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?Z$/.test(
        authorized.updated_at,
      ),
  );

  // deleted_at can be null or undefined
  if (authorized.deleted_at !== null && authorized.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO 8601",
      typeof authorized.deleted_at === "string" &&
        /^{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?Z$/.test(
          authorized.deleted_at,
        ),
    );
  }

  // Validate optional access_token and refresh_token if present
  TestValidator.predicate(
    "access_token is string if present",
    authorized.access_token === undefined ||
      typeof authorized.access_token === "string",
  );

  TestValidator.predicate(
    "refresh_token is string if present",
    authorized.refresh_token === undefined ||
      typeof authorized.refresh_token === "string",
  );

  // Validate token object fields
  TestValidator.predicate(
    "token object has correct types",
    authorized.token !== null &&
      typeof authorized.token.access === "string" &&
      typeof authorized.token.refresh === "string" &&
      typeof authorized.token.expired_at === "string" &&
      typeof authorized.token.refreshable_until === "string",
  );

  // 2. Employee join - failure case: duplicate email case
  await TestValidator.error("join with duplicate email must fail", async () => {
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  });
}
