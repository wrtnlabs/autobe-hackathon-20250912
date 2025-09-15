import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalKnowledgeArea } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalKnowledgeArea";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test the successful retrieval of detailed information for a specific
 * knowledge area by its ID using an authenticated employee user.
 *
 * This scenario involves creating a new employee user and a manager user,
 * establishing authentication contexts for both roles. Then the manager creates
 * a knowledge area which is subsequently retrieved successfully by the
 * employee. The test ensures correct multi-role authentication, creation, and
 * retrieval of knowledge area data with full validation.
 */
export async function test_api_knowledge_area_retrieve_success_employee(
  connection: api.IConnection,
) {
  // 1. Employee user creation with join
  const employeeEmail: string = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(12);
  const employeePasswordHash = employeePassword; // For test, password hash simulated as password string
  const employeeName = RandomGenerator.name();

  const employee = await api.functional.auth.employee.join.joinEmployee(
    connection,
    {
      body: {
        email: employeeEmail,
        password_hash: employeePasswordHash,
        name: employeeName,
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    },
  );
  typia.assert(employee);

  // 2. Manager user creation with join
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerPassword = RandomGenerator.alphaNumeric(12);
  const managerName = RandomGenerator.name();

  const manager = await api.functional.auth.manager.join(connection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      name: managerName,
    } satisfies IJobPerformanceEvalManager.ICreate,
  });
  typia.assert(manager);

  // 3. Manager authentication login
  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerEmail,
      password: managerPassword,
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  // 4. Create knowledge area
  const knowledgeAreaCode = RandomGenerator.alphaNumeric(6).toUpperCase();
  const knowledgeAreaName = RandomGenerator.name(2);
  const knowledgeAreaDescription = RandomGenerator.paragraph({ sentences: 3 });

  const knowledgeArea =
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

  // 5. Employee login
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // 6. Retrieve knowledge area by ID
  const retrievedKnowledgeArea =
    await api.functional.jobPerformanceEval.employee.knowledgeAreas.at(
      connection,
      { id: knowledgeArea.id },
    );
  typia.assert(retrievedKnowledgeArea);

  // 7. Validate properties
  TestValidator.equals(
    "knowledge area id matches",
    retrievedKnowledgeArea.id,
    knowledgeArea.id,
  );
  TestValidator.equals(
    "knowledge area code matches",
    retrievedKnowledgeArea.code,
    knowledgeArea.code,
  );
  TestValidator.equals(
    "knowledge area name matches",
    retrievedKnowledgeArea.name,
    knowledgeArea.name,
  );

  if (
    knowledgeArea.description === null ||
    knowledgeArea.description === undefined
  ) {
    TestValidator.equals(
      "knowledge area description is null",
      retrievedKnowledgeArea.description,
      knowledgeArea.description ?? null,
    );
  } else {
    TestValidator.equals(
      "knowledge area description matches",
      retrievedKnowledgeArea.description,
      knowledgeArea.description,
    );
  }
}
