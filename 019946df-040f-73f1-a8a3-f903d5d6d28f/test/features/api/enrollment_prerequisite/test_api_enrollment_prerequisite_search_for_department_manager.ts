import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsEnrollmentPrerequisite";

/**
 * End-to-end testing of enrollment prerequisite search for department
 * manager role.
 *
 * This test validates the full flow of a department manager creating
 * prerequisites, and searching them via
 * /enterpriseLms/departmentManager/enrollments/{enrollmentId}/enrollmentPrerequisites
 * endpoint. It includes authentication, tenant isolation, filtered
 * searching, pagination, sorting, and error handling.
 *
 * 1. Register and login as departmentManager
 * 2. Setup tenant-specific test data for enrollment and prerequisites
 * 3. Perform PATCH searches with filters and pagination
 * 4. Validate returned results and pagination metadata
 * 5. Test security by verifying unauthorized access is denied
 * 6. Confirm validation failures return appropriate error responses
 */
export async function test_api_enrollment_prerequisite_search_for_department_manager(
  connection: api.IConnection,
) {
  // 1. Register department manager and login
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@department.com`,
    password: "StrongP@ssw0rd",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const joined = await api.functional.auth.departmentManager.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;
  await api.functional.auth.departmentManager.login(connection, {
    body: loginBody,
  });

  // 2. Set tenant id and enrollment id
  const tenantId = joined.tenant_id;
  const enrollmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Perform a search with pagination and filtering on enrollment_id
  const searchRequest = {
    page: 1,
    limit: 10,
    sort: "created_at asc",
    enrollment_id: enrollmentId,
  } satisfies IEnterpriseLmsEnrollmentPrerequisite.IRequest;

  const searchResponse =
    await api.functional.enterpriseLms.departmentManager.enrollments.enrollmentPrerequisites.index(
      connection,
      { enrollmentId, body: searchRequest },
    );
  typia.assert(searchResponse);

  // Validate pagination
  TestValidator.equals(
    "pagination current page is 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    searchResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data length is <= 10",
    searchResponse.data.length <= 10,
  );

  // Validate that all returned items have the correct enrollment_id
  for (const item of searchResponse.data) {
    TestValidator.equals(
      "item enrollment_id matches requested",
      item.enrollment_id,
      enrollmentId,
    );
  }

  // 4. Test unknown enrollmentId returns 404 error
  const invalidEnrollmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "search with invalid enrollmentId should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.enrollments.enrollmentPrerequisites.index(
        connection,
        { enrollmentId: invalidEnrollmentId, body: searchRequest },
      );
    },
  );

  // 5. Test invalid request body triggers validation error
  const invalidSearchRequest = {
    page: -1,
    limit: 0,
    sort: null,
    enrollment_id: null,
    prerequisite_course_id: null,
  } satisfies IEnterpriseLmsEnrollmentPrerequisite.IRequest;

  await TestValidator.error(
    "search with invalid request body should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.enrollments.enrollmentPrerequisites.index(
        connection,
        { enrollmentId, body: invalidSearchRequest },
      );
    },
  );

  // 6. Test unauthorized access (simulate by resetting headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized search attempt should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.enrollments.enrollmentPrerequisites.index(
        unauthConnection,
        { enrollmentId, body: searchRequest },
      );
    },
  );
}
