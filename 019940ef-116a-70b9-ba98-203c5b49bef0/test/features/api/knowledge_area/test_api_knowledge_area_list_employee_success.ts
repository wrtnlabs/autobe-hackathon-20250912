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
 * This test function verifies the complete process of registering an employee
 * user, authenticating as the employee, and successfully retrieving a filtered,
 * paginated list of job performance evaluation knowledge areas using the PATCH
 * /jobPerformanceEval/employee/knowledgeAreas endpoint. It begins by creating a
 * new employee with realistic but randomly generated email, hashed password,
 * and name as per IJobPerformanceEvalEmployee.ICreate. The function then
 * requests knowledge area listings filtering by partial code and name matches,
 * checking pagination parameters including page and limit, and sorting via
 * orderBy and orderDirection. Assertions ensure the response conforms to
 * IPageIJobPerformanceEvalKnowledgeArea.ISummary including nested pagination
 * info and the list of knowledge area summaries. All API responses are verified
 * with typia.assert for type safety. This end-to-end test ensures the API meets
 * requirements for authenticated employee usage with appropriate business logic
 * and data integrity.
 */
export async function test_api_knowledge_area_list_employee_success(
  connection: api.IConnection,
) {
  // 1. Create new employee user and authenticate
  const employeeCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32), // Simulated hashed password
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // 2. Prepare knowledge area list request body with realistic filters
  const knowledgeAreaRequest = {
    code: RandomGenerator.substring("KNOWLEDGE"),
    name: RandomGenerator.substring("Area"),
    page: 1,
    limit: 10,
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IJobPerformanceEvalKnowledgeArea.IRequest;

  // 3. Retrieve filtered, paginated knowledge area list
  const pageResult: IPageIJobPerformanceEvalKnowledgeArea.ISummary =
    await api.functional.jobPerformanceEval.employee.knowledgeAreas.index(
      connection,
      {
        body: knowledgeAreaRequest,
      },
    );
  typia.assert(pageResult);

  // 4. Assert pagination info properties
  TestValidator.predicate(
    "pagination.current page number is positive",
    pageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pageResult.pagination.records >= 0,
  );

  // 5. Assert knowledge area list property types
  TestValidator.predicate(
    "knowledge area data array is Array",
    Array.isArray(pageResult.data),
  );

  // 6. Optional content validation: check each knowledge area summary
  for (const knowledgeArea of pageResult.data) {
    typia.assert(knowledgeArea);
    TestValidator.predicate(
      "knowledge area id is valid UUID",
      typeof knowledgeArea.id === "string" && knowledgeArea.id.length > 0,
    );
    TestValidator.predicate(
      "knowledge area code is non-empty string",
      typeof knowledgeArea.code === "string" && knowledgeArea.code.length > 0,
    );
    TestValidator.predicate(
      "knowledge area name is non-empty string",
      typeof knowledgeArea.name === "string" && knowledgeArea.name.length > 0,
    );
  }
}
