import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate creating an enrollment prerequisite by an authorized
 * organization administrator.
 *
 * This test ensures that only organization admins can create enrollment
 * prerequisite records linking an enrollment with a prerequisite course. It
 * includes positive flow tests and negative tests for invalid IDs and
 * unauthorized access.
 *
 * Steps:
 *
 * 1. Register and authenticate a new organization admin.
 * 2. Generate valid enrollment and prerequisite course IDs.
 * 3. Create enrollment prerequisite using valid data.
 * 4. Assert the response record correctness.
 * 5. Test errors on invalid enrollment ID and invalid prerequisite course ID.
 * 6. Verify that unauthenticated attempts fail with authorization error.
 *
 * Validations rely on typia.assert and TestValidator for comprehensive type
 * and logic checking.
 */
export async function test_api_enrollment_prerequisite_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate organization admin
  const organizationAdminCreate = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: "StrongP@ssw0rd",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminCreate,
    });
  typia.assert(orgAdmin);

  // Use the tenant_id from the created organization admin for the test
  const tenantId = orgAdmin.tenant_id;

  // 2. Prepare valid test data for enrollment and prerequisite course
  // Since we don't have API for enrollment and course creation in materials, generate random but valid UUIDs for test
  const validEnrollmentId = typia.random<string & tags.Format<"uuid">>();
  const validPrerequisiteCourseId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create enrollment prerequisite with valid data
  const createBody = {
    enrollment_id: validEnrollmentId,
    prerequisite_course_id: validPrerequisiteCourseId,
  } satisfies IEnterpriseLmsEnrollmentPrerequisite.ICreate;

  const prerequisite =
    await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.createEnrollmentPrerequisite(
      connection,
      {
        enrollmentId: validEnrollmentId,
        body: createBody,
      },
    );
  typia.assert(prerequisite);

  // Validate returned record data matches request and system generated fields
  TestValidator.equals(
    "enrollment_id matches",
    prerequisite.enrollment_id,
    validEnrollmentId,
  );
  TestValidator.equals(
    "prerequisite_course_id matches",
    prerequisite.prerequisite_course_id,
    validPrerequisiteCourseId,
  );
  TestValidator.predicate(
    "id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      prerequisite.id,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    !isNaN(Date.parse(prerequisite.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    !isNaN(Date.parse(prerequisite.updated_at)),
  );

  // 4. Error test: Create with invalid enrollment ID
  const invalidEnrollmentId = "00000000-0000-0000-0000-000000000000";
  const invalidBody1 = {
    enrollment_id: invalidEnrollmentId,
    prerequisite_course_id: validPrerequisiteCourseId,
  } satisfies IEnterpriseLmsEnrollmentPrerequisite.ICreate;
  await TestValidator.error(
    "should fail with invalid enrollment ID",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.createEnrollmentPrerequisite(
        connection,
        {
          enrollmentId: invalidEnrollmentId,
          body: invalidBody1,
        },
      );
    },
  );

  // 5. Error test: Create with invalid prerequisite course ID
  const invalidPrerequisiteCourseId = "00000000-0000-0000-0000-000000000001";
  const invalidBody2 = {
    enrollment_id: validEnrollmentId,
    prerequisite_course_id: invalidPrerequisiteCourseId,
  } satisfies IEnterpriseLmsEnrollmentPrerequisite.ICreate;
  await TestValidator.error(
    "should fail with invalid prerequisite course ID",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.createEnrollmentPrerequisite(
        connection,
        {
          enrollmentId: validEnrollmentId,
          body: invalidBody2,
        },
      );
    },
  );

  // 6. Error test: Unauthorized attempt to create enrollment prerequisite
  // Simulate unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  await TestValidator.error("should fail unauthorized creation", async () => {
    await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.createEnrollmentPrerequisite(
      unauthenticatedConnection,
      {
        enrollmentId: validEnrollmentId,
        body: createBody,
      },
    );
  });
}
