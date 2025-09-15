import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalKnowledgeArea } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalKnowledgeArea";

/**
 * Test creating a new knowledge area as an authenticated employee user.
 *
 * This test covers the entire flow of employee user registration and
 * authentication, followed by creation of a knowledge area with valid and
 * unique code and name.
 *
 * Steps:
 *
 * 1. Register and authenticate an employee user using the /auth/employee/join
 *    API.
 * 2. Create a new knowledge area with unique code, name, and optional detailed
 *    description.
 * 3. Verify the knowledge area's returned properties including UUID format ID,
 *    exact code, name, description, and ISO 8601 formatted timestamps.
 *
 * All API calls are properly awaited and validated with typia.assert.
 * TestValidator assertions confirm correct values and formats according to
 * business rules.
 *
 * @param connection API connection used for requests
 */
export async function test_api_knowledge_area_creation_success_with_employee_authentication(
  connection: api.IConnection,
) {
  // 1. Employee user registers and authenticates using the join API.
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePasswordHash = RandomGenerator.alphaNumeric(64); // Simulate hashed password
  const employeeName = RandomGenerator.name(2);

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail,
        password_hash: employeePasswordHash,
        name: employeeName,
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee);

  // 2. Create a new knowledge area as authenticated employee.
  const knowledgeAreaCode = `KA-${RandomGenerator.alphaNumeric(5).toUpperCase()}`;
  const knowledgeAreaName = RandomGenerator.name(3);
  const knowledgeAreaDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 7,
  });

  const knowledgeArea: IJobPerformanceEvalKnowledgeArea =
    await api.functional.jobPerformanceEval.employee.knowledgeAreas.create(
      connection,
      {
        body: {
          code: knowledgeAreaCode,
          name: knowledgeAreaName,
          description: knowledgeAreaDescription,
        } satisfies IJobPerformanceEvalKnowledgeArea.ICreate,
      },
    );
  typia.assert(knowledgeArea);

  // 3. Validate the created knowledge area properties.
  TestValidator.predicate(
    "knowledge area id looks like uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      knowledgeArea.id,
    ),
  );
  TestValidator.equals(
    "knowledge area code matches",
    knowledgeArea.code,
    knowledgeAreaCode,
  );
  TestValidator.equals(
    "knowledge area name matches",
    knowledgeArea.name,
    knowledgeAreaName,
  );
  TestValidator.equals(
    "knowledge area description matches",
    knowledgeArea.description ?? null,
    knowledgeAreaDescription,
  );
  // timestamps should be strings in ISO 8601 format
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof knowledgeArea.created_at === "string" &&
      !isNaN(Date.parse(knowledgeArea.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof knowledgeArea.updated_at === "string" &&
      !isNaN(Date.parse(knowledgeArea.updated_at)),
  );
  // deleted_at can be undefined or null explicitly - if present, must be ISO string
  if (
    knowledgeArea.deleted_at !== undefined &&
    knowledgeArea.deleted_at !== null
  ) {
    TestValidator.predicate(
      "deleted_at is ISO date string",
      typeof knowledgeArea.deleted_at === "string" &&
        !isNaN(Date.parse(knowledgeArea.deleted_at)),
    );
  }
}
