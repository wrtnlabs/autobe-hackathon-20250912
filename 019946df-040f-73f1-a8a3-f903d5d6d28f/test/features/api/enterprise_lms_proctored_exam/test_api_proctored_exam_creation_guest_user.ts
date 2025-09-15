import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";

/**
 * Test the creation of a proctored exam session by a guest user for a specific
 * assessment.
 *
 * This test verifies that a guest user can be created and authenticated, and
 * then successfully create a proctored exam linked to a known assessment ID. It
 * ensures data integrity, type safety, and correct API behavior for the guest
 * role.
 *
 * Steps:
 *
 * 1. Create and authenticate a guest user using the guest join API.
 * 2. Use a generated UUID as the assessment ID.
 * 3. Create a proctored exam session with all required fields and valid UUIDs for
 *    examSessionId and proctorId.
 * 4. Validate returned data correctness and schema compliance.
 */
export async function test_api_proctored_exam_creation_guest_user(
  connection: api.IConnection,
) {
  // 1. Create and authenticate guest user
  const guestCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;
  const guest: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestCreateBody });
  typia.assert(guest);

  // 2. Define assessmentId for the exam
  const assessmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create a proctored exam for the assessment
  const examCreateBody = {
    assessment_id: assessmentId,
    exam_session_id: RandomGenerator.alphaNumeric(24),
    proctor_id: typia.random<string & tags.Format<"uuid">>(),
    scheduled_at: new Date().toISOString(),
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;

  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.guest.assessments.proctoredExams.create(
      connection,
      {
        assessmentId,
        body: examCreateBody,
      },
    );
  typia.assert(proctoredExam);

  // Validate returned exam properties
  TestValidator.equals(
    "assessment_id matches provided assessmentId",
    proctoredExam.assessment_id,
    assessmentId,
  );
  TestValidator.equals(
    "status matches",
    proctoredExam.status,
    examCreateBody.status,
  );
  TestValidator.predicate(
    "exam_session_id is non-empty string",
    proctoredExam.exam_session_id.length > 0,
  );
}
