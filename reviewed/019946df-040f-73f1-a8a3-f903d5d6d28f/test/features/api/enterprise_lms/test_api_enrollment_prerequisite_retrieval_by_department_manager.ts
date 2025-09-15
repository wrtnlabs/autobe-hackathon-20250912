import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";

/**
 * Test scenario: Department manager enrollment prerequisite retrieval.
 *
 * This E2E test verifies that a newly joined department manager can
 * authenticate, then retrieve enrollment prerequisite details for specific
 * enrollments and enrollment prerequisites within their tenant.
 *
 * Steps:
 *
 * 1. Join a new department manager account with randomized, valid data.
 * 2. Use the obtained authorization token implicitly via SDK to access data.
 * 3. Generate realistic UUID values as enrollments and prerequisite IDs.
 * 4. Retrieve enrollment prerequisite by enrollmentId and
 *    enrollmentPrerequisiteId.
 * 5. Verify the response data structure with typia.assert.
 * 6. Test failure scenarios for invalid IDs, expecting error throw.
 */
export async function test_api_enrollment_prerequisite_retrieval_by_department_manager(
  connection: api.IConnection,
) {
  // 1. Join department manager
  const createBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "Password123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const authorized: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Generate valid UUIDs for enrollment and prerequisite
  const enrollmentId = typia.random<string & tags.Format<"uuid">>();
  const enrollmentPrerequisiteId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve enrollment prerequisite
  const prerequisite: IEnterpriseLmsEnrollmentPrerequisite =
    await api.functional.enterpriseLms.departmentManager.enrollments.enrollmentPrerequisites.at(
      connection,
      { enrollmentId, enrollmentPrerequisiteId },
    );
  typia.assert(prerequisite);

  // Validate important fields exist and match UUID format
  TestValidator.predicate(
    "prerequisite id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      prerequisite.id,
    ),
  );
  TestValidator.predicate(
    "prerequisite enrollment_id matches input",
    prerequisite.enrollment_id === enrollmentId,
  );

  // Additional validation for date format
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    !isNaN(Date.parse(prerequisite.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    !isNaN(Date.parse(prerequisite.updated_at)),
  );

  // 4. Test error scenarios: invalid UUID formats
  await TestValidator.error(
    "fetch with invalid enrollmentId throws error",
    async () => {
      await api.functional.enterpriseLms.departmentManager.enrollments.enrollmentPrerequisites.at(
        connection,
        { enrollmentId: "invalid-uuid", enrollmentPrerequisiteId },
      );
    },
  );

  await TestValidator.error(
    "fetch with invalid enrollmentPrerequisiteId throws error",
    async () => {
      await api.functional.enterpriseLms.departmentManager.enrollments.enrollmentPrerequisites.at(
        connection,
        { enrollmentId, enrollmentPrerequisiteId: "invalid-uuid" },
      );
    },
  );
}
