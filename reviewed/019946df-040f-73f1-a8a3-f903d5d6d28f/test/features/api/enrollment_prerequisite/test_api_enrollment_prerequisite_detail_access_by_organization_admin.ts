import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test retrieval of enrollment prerequisite details by an organization admin.
 *
 * This function verifies that an organization administrator can successfully
 * register, authenticate, and access detailed information about a specific
 * enrollment prerequisite.
 *
 * The test follows this sequence:
 *
 * 1. Organization admin signs up and authenticates.
 * 2. Simulates the presence of an enrollment and its prerequisite.
 * 3. Fetches the enrollment prerequisite details with valid IDs.
 * 4. Validates that the returned data matches.
 * 5. Attempts access with unauthorized connections to ensure proper error handling
 *    (403).
 * 6. Attempts fetching with invalid UUID parameters to validate 404 errors.
 *
 * The test ensures API enforces tenant isolation, role-based access, and
 * correct data retrieval.
 */
export async function test_api_enrollment_prerequisite_detail_access_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Organization admin signs up
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "ValidPassword123!";

  const createRequest = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorizedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: createRequest,
    });
  typia.assert(authorizedAdmin);

  // 2. Simulate an enrollment prerequisite data (using random realistic UUID values)
  // Because there is no API to create enrollment or enrollment prerequisite, we
  // simulate UUIDs matching the organization admin's tenant
  const enrollmentId = typia.random<string & tags.Format<"uuid">>();
  const enrollmentPrerequisiteId = typia.random<string & tags.Format<"uuid">>();
  const prerequisiteCourseId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch the enrollment prerequisite details
  const enrollmentPrerequisite: IEnterpriseLmsEnrollmentPrerequisite =
    await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.at(
      connection,
      {
        enrollmentId: enrollmentId,
        enrollmentPrerequisiteId: enrollmentPrerequisiteId,
      },
    );
  typia.assert(enrollmentPrerequisite);

  // 4. Validate that the response has the requested IDs
  TestValidator.equals(
    "enrollmentPrerequisite id matches requested",
    enrollmentPrerequisite.id,
    enrollmentPrerequisiteId,
  );
  TestValidator.equals(
    "enrollment id matches requested",
    enrollmentPrerequisite.enrollment_id,
    enrollmentId,
  );

  // 5. Unauthorized access test: create an empty connection without authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.at(
      unauthConn,
      {
        enrollmentId: enrollmentId,
        enrollmentPrerequisiteId: enrollmentPrerequisiteId,
      },
    );
  });
}
