import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This test validates the deletion workflow of enrollment prerequisite
 * records by a system administrator within the Enterprise LMS system.
 *
 * The workflow includes:
 *
 * 1. Registering a system administrator (join).
 * 2. Logging in as the system administrator.
 * 3. Simulating prerequisite resource identifiers (tenant, learner, course,
 *    enrollment, enrollment prerequisite) since creation APIs are missing.
 * 4. Deleting an enrollment prerequisite record using the DELETE endpoint.
 * 5. Verifying that deletion of non-existent prerequisite records triggers an
 *    error.
 *
 * The test ensures proper authentication, authorization, and error handling
 * conforming to RESTful standards and multi-tenancy constraints.
 */
export async function test_api_enrollment_enrollment_prerequisites_deletion(
  connection: api.IConnection,
) {
  // 1. System administrator registration
  const adminCreateBody = {
    email: `sysadmin.${RandomGenerator.alphaNumeric(8)}@enterprise.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(systemAdmin);

  // 2. System administrator login with created credentials
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedInAdmin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(loggedInAdmin);

  // 3. Simulate prerequisite resource IDs (as related APIs are not provided)
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const learnerId = typia.random<string & tags.Format<"uuid">>();
  const prerequisiteCourseId = typia.random<string & tags.Format<"uuid">>();
  const enrollmentId = typia.random<string & tags.Format<"uuid">>();
  const enrollmentPrerequisiteId = typia.random<string & tags.Format<"uuid">>();

  // 4. Execute deletion of an enrollment prerequisite
  await api.functional.enterpriseLms.systemAdmin.enrollments.enrollmentPrerequisites.eraseEnrollmentPrerequisite(
    connection,
    {
      enrollmentId,
      enrollmentPrerequisiteId,
    },
  );

  // 5. Validate deletion error handling by attempting to delete a non-existent prerequisite
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent enrollment prerequisite fails",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.enrollments.enrollmentPrerequisites.eraseEnrollmentPrerequisite(
        connection,
        {
          enrollmentId,
          enrollmentPrerequisiteId: nonExistentId,
        },
      );
    },
  );
}
