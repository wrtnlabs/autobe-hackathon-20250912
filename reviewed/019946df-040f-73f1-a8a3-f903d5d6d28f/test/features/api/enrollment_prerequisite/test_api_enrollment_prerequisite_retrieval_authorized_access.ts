import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Validates authorized access and retrieval of enrollment prerequisites.
 *
 * This test covers:
 *
 * 1. System administrator account creation and login to obtain authorization
 *    token.
 * 2. Successful retrieval of an existing enrollment prerequisite by
 *    enrollmentId and enrollmentPrerequisiteId.
 * 3. Validation of the returned enrollment prerequisite data fields.
 * 4. Testing error scenarios for invalid UUIDs leading to not found errors.
 * 5. Testing unauthorized access scenarios by attempting retrieval with
 *    insufficient privileges.
 */
export async function test_api_enrollment_prerequisite_retrieval_authorized_access(
  connection: api.IConnection,
) {
  // 1. Creating system administrator account and authenticate
  const adminCreateBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password_hash: RandomGenerator.alphabets(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Attempting to retrieve an enrollment prerequisite with valid IDs
  const enrollmentId = typia.random<string & tags.Format<"uuid">>();
  const prereqId = typia.random<string & tags.Format<"uuid">>();

  const prerequisite: IEnterpriseLmsEnrollmentPrerequisite =
    await api.functional.enterpriseLms.systemAdmin.enrollments.enrollmentPrerequisites.at(
      connection,
      {
        enrollmentId: enrollmentId,
        enrollmentPrerequisiteId: prereqId,
      },
    );
  typia.assert(prerequisite);

  TestValidator.equals(
    "retrieved enrollment prerequisite ID matches",
    prerequisite.id,
    prereqId,
  );
  TestValidator.equals(
    "retrieved enrollment prerequisite belongs to given enrollment",
    prerequisite.enrollment_id,
    enrollmentId,
  );

  // 3. Test error when using invalid enrollmentId
  await TestValidator.error(
    "error when retrieving with invalid enrollmentId",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.enrollments.enrollmentPrerequisites.at(
        connection,
        {
          enrollmentId: "00000000-0000-0000-0000-000000000000",
          enrollmentPrerequisiteId: prereqId,
        },
      );
    },
  );

  // 4. Test error when using invalid enrollmentPrerequisiteId
  await TestValidator.error(
    "error when retrieving with invalid enrollmentPrerequisiteId",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.enrollments.enrollmentPrerequisites.at(
        connection,
        {
          enrollmentId: enrollmentId,
          enrollmentPrerequisiteId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );

  // 5. Test unauthorized access by simulating retrieval without admin login (unauthorized attempt)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "forbidden error when unauthorized user attempts retrieval",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.enrollments.enrollmentPrerequisites.at(
        unauthConnection,
        {
          enrollmentId: enrollmentId,
          enrollmentPrerequisiteId: prereqId,
        },
      );
    },
  );
}
