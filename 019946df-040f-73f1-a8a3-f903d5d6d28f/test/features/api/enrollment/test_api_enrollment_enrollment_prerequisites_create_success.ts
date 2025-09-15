import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This test validates the creation of an enrollment prerequisite by a
 * system administrator.
 *
 * The system administrator is first registered and logged in via dedicated
 * auth endpoints. Then, a new enrollment prerequisite is created, linking
 * an enrollment with a prerequisite course. The test verifies the
 * response's integrity and timestamp presence.
 *
 * Steps:
 *
 * 1. Register system admin.
 * 2. Log in system admin.
 * 3. Create enrollment prerequisite.
 * 4. Validate response.
 */
export async function test_api_enrollment_enrollment_prerequisites_create_success(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // 2. Login system admin
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const loggedInAdmin = await api.functional.auth.systemAdmin.login(
    connection,
    { body: adminLoginBody },
  );
  typia.assert(loggedInAdmin);

  // 3. Use UUIDs for enrollment and prerequisite course
  const enrollmentId = typia.random<string & tags.Format<"uuid">>();
  const prerequisiteCourseId = typia.random<string & tags.Format<"uuid">>();
  const prerequisiteCreateBody = {
    enrollment_id: enrollmentId,
    prerequisite_course_id: prerequisiteCourseId,
  } satisfies IEnterpriseLmsEnrollmentPrerequisite.ICreate;

  // 4. Create the enrollment prerequisite
  const prerequisite =
    await api.functional.enterpriseLms.systemAdmin.enrollments.enrollmentPrerequisites.createEnrollmentPrerequisite(
      connection,
      {
        enrollmentId: enrollmentId,
        body: prerequisiteCreateBody,
      },
    );
  typia.assert(prerequisite);

  // 5. Validate response
  TestValidator.equals(
    "created prerequisite enrollment_id equals request",
    prerequisite.enrollment_id,
    enrollmentId,
  );
  TestValidator.equals(
    "created prerequisite course_id equals request",
    prerequisite.prerequisite_course_id,
    prerequisiteCourseId,
  );
  TestValidator.predicate(
    "created prerequisite id is non-empty UUID",
    typeof prerequisite.id === "string" && prerequisite.id.length > 0,
  );
  TestValidator.predicate(
    "created prerequisite created_at is valid ISO date",
    typeof prerequisite.created_at === "string" &&
      prerequisite.created_at.length > 0,
  );
  TestValidator.predicate(
    "created prerequisite updated_at is valid ISO date",
    typeof prerequisite.updated_at === "string" &&
      prerequisite.updated_at.length > 0,
  );
}
