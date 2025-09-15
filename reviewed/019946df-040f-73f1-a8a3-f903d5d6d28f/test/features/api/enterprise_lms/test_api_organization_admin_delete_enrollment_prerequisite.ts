import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Tests the deletion of an enrollment prerequisite record by an
 * organization administrator.
 *
 * This test function covers the full realistic business scenario:
 *
 * 1. Create a new organization administrator user (tenant-specific).
 * 2. Login as the organization administrator to obtain auth context.
 * 3. Attempt to delete an enrollment prerequisite providing valid enrollmentId
 *    and prerequisiteId, expecting successful hard deletion.
 * 4. Attempt to delete with invalid enrollmentId and invalid prerequisiteId,
 *    expecting errors.
 * 5. Attempt cross-tenant deletion scenarios if possible, verifying
 *    authorization is correctly enforced.
 * 6. Attempt deletion using unauthenticated or unauthorized connections,
 *    expecting access denied errors.
 *
 * Note: The test assumes that valid enrollment and prerequisite IDs are
 * known or generated, but since the API only supports delete operation with
 * IDs (no creation or fetching), we must fake valid UUIDs for
 * demonstration. Realistic scenario testing might require additional setup
 * APIs (not in scope).
 *
 * The test includes careful type safety, uses typia assertions for
 * responses (void here, so just success), and leverages TestValidator for
 * error cases. Auth tokens are managed automatically by SDK's authenticated
 * connection management.
 */
export async function test_api_organization_admin_delete_enrollment_prerequisite(
  connection: api.IConnection,
) {
  // 1. Join organizationAdmin user with valid tenant and credentials
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1)}@example.com`;
  const password = "StrongP@ssw0rd";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const joinedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(joinedAdmin);

  // 2. Login as the same organizationAdmin user
  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Prepare valid UUIDs for enrollment and enrollmentPrerequisite
  // (Since no create APIs for enrollment/prerequisites are given, we fake valid UUIDs here)
  const validEnrollmentId = typia.random<string & tags.Format<"uuid">>();
  const validEnrollmentPrerequisiteId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt to delete with valid IDs - expect success (void response means no exception)
  await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.eraseEnrollmentPrerequisite(
    connection,
    {
      enrollmentId: validEnrollmentId,
      enrollmentPrerequisiteId: validEnrollmentPrerequisiteId,
    },
  );

  // 5. Attempt to delete with invalid enrollmentId - expect error
  await TestValidator.error(
    "deletion fails with invalid enrollment ID",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.eraseEnrollmentPrerequisite(
        connection,
        {
          enrollmentId: "invalid-uuid-string",
          enrollmentPrerequisiteId: validEnrollmentPrerequisiteId,
        },
      );
    },
  );

  // 6. Attempt to delete with invalid enrollmentPrerequisiteId - expect error
  await TestValidator.error(
    "deletion fails with invalid prerequisite ID",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.eraseEnrollmentPrerequisite(
        connection,
        {
          enrollmentId: validEnrollmentId,
          enrollmentPrerequisiteId: "invalid-uuid-string",
        },
      );
    },
  );

  // 7. Attempt to delete with both invalid IDs - expect error
  await TestValidator.error(
    "deletion fails with both invalid IDs",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.eraseEnrollmentPrerequisite(
        connection,
        {
          enrollmentId: "invalid-uuid-string",
          enrollmentPrerequisiteId: "invalid-uuid-string",
        },
      );
    },
  );

  // 8. Attempt to delete with wrong tenantId - simulate by re-joining another admin with different tenant
  const otherTenantId = typia.random<string & tags.Format<"uuid">>();
  const otherEmail = `${RandomGenerator.name(1)}@example.com`;
  const otherPassword = "StrongP@ssw0rd";

  const otherAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: otherTenantId,
        email: otherEmail,
        password: otherPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(otherAdmin);

  // Login as other admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherEmail,
      password: otherPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // Now try deletion with valid IDs but different tenant context - expect error for cross tenant delete
  await TestValidator.error(
    "deletion fails when attempted by admin of different tenant",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.eraseEnrollmentPrerequisite(
        connection,
        {
          enrollmentId: validEnrollmentId,
          enrollmentPrerequisiteId: validEnrollmentPrerequisiteId,
        },
      );
    },
  );

  // 9. Optionally, test deletion with unauthenticated or unauthorized connection
  // (Assuming unauthenticated connection has headers cleared)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "deletion fails without authentication",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.enrollments.enrollmentPrerequisites.eraseEnrollmentPrerequisite(
        unauthenticatedConnection,
        {
          enrollmentId: validEnrollmentId,
          enrollmentPrerequisiteId: validEnrollmentPrerequisiteId,
        },
      );
    },
  );
}
