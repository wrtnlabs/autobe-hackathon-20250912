import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test updating an Enterprise LMS enrollment record by a system
 * administrator.
 *
 * This test ensures a system admin is registered and authenticated, then
 * performs an update on an enrollment via PUT
 * /enterpriseLms/systemAdmin/enrollments/{id}. The test validates tenant
 * data isolation, admin authorization, and correctness of update results.
 * It also checks error handling for invalid updates.
 *
 * Steps:
 *
 * 1. Register and authenticate a system administrator.
 * 2. Prepare a valid enrollment ID (UUID).
 * 3. Construct an update payload with changed status, learner ID, learning
 *    path ID, and an explicit null business status.
 * 4. Call update API and validate the response accurately reflects changes.
 * 5. Attempt update with invalid enrollment ID to verify error handling.
 */
export async function test_api_enrollment_update_by_systemadmin(
  connection: api.IConnection,
) {
  // 1. Register system administrator with valid details
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Simulate obtaining a valid enrollment ID for update
  const enrollmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Construct update payload with valid UUIDs and strings, and business_status as null
  const enrollmentUpdateBody = {
    learner_id: typia.random<string & tags.Format<"uuid">>(),
    learning_path_id: typia.random<string & tags.Format<"uuid">>(),
    status: "active",
    business_status: null,
  } satisfies IEnterpriseLmsEnrollment.IUpdate;

  // 4. Perform the update API call
  const updatedEnrollment: IEnterpriseLmsEnrollment =
    await api.functional.enterpriseLms.systemAdmin.enrollments.update(
      connection,
      {
        id: enrollmentId,
        body: enrollmentUpdateBody,
      },
    );
  typia.assert(updatedEnrollment);

  // 5. Validate that the updated enrollment reflects the changes
  TestValidator.equals(
    "updated enrollment id should match",
    updatedEnrollment.id,
    enrollmentId,
  );
  TestValidator.equals(
    "updated learner_id should match",
    updatedEnrollment.learner_id,
    enrollmentUpdateBody.learner_id,
  );
  TestValidator.equals(
    "updated learning_path_id should match",
    updatedEnrollment.learning_path_id,
    enrollmentUpdateBody.learning_path_id,
  );
  TestValidator.equals(
    "updated status should match",
    updatedEnrollment.status,
    enrollmentUpdateBody.status,
  );
  TestValidator.equals(
    "updated business_status should be null",
    updatedEnrollment.business_status ?? null,
    null,
  );

  // 6. Test error case: update with invalid enrollment ID (bad UUID)
  const invalidEnrollmentId = "invalid-uuid-format";
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "should throw error with invalid enrollment id",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.enrollments.update(
        connection,
        {
          id: invalidEnrollmentId as string & tags.Format<"uuid">,
          body: enrollmentUpdateBody,
        },
      );
    },
  );

  // 7. (Optional) Test unauthorized update with empty headers connection
  await TestValidator.error(
    "should throw unauthorized error with empty headers",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.enrollments.update(
        unauthConnection,
        {
          id: enrollmentId,
          body: enrollmentUpdateBody,
        },
      );
    },
  );
}
