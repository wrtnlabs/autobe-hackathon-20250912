import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";

export async function test_api_blended_learning_sessions_update_by_guest(
  connection: api.IConnection,
) {
  // 1. Register a new guest user and authenticate
  const guestEmail = `${RandomGenerator.name(1).toLowerCase()}${Date.now()}@example.com`;
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const guestBody = {
    tenant_id: tenantId,
    email: guestEmail,
    password_hash: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guest: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestBody });
  typia.assert(guest);

  // 2. Search for blended learning sessions
  // Note: tenant_id is not filterable in IRequest DTO;
  // fetch general sessions and pick any for testing

  const sessionSearchRequest = {
    status: undefined,
    session_type: undefined,
    title: undefined,
    scheduled_start_at_from: undefined,
    scheduled_start_at_to: undefined,
    scheduled_end_at_from: undefined,
    scheduled_end_at_to: undefined,
    page: 1,
    limit: 10,
    order_by: "scheduled_start_at DESC",
  } satisfies IEnterpriseLmsBlendedLearningSession.IRequest;

  const list: IPageIEnterpriseLmsBlendedLearningSession.ISummary =
    await api.functional.enterpriseLms.guest.blendedLearningSessions.index(
      connection,
      {
        body: sessionSearchRequest,
      },
    );
  typia.assert(list);

  const session = list.data.length > 0 ? list.data[0] : undefined;
  TestValidator.predicate(
    "At least one blended learning session found",
    session !== undefined,
  );

  if (!session) return;

  // 3. Update a proctored exam session - IDs generated randomly

  const assessmentId = typia.random<string & tags.Format<"uuid">>();
  const proctoredExamId = typia.random<string & tags.Format<"uuid">>();
  const nowString = new Date().toISOString();

  const proctoredExamUpdateBody = {
    assessment_id: assessmentId,
    exam_session_id: `EXAM-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    proctor_id: null,
    scheduled_at: nowString,
    status: "scheduled" as const,
    updated_at: nowString,
    deleted_at: null,
  } satisfies IEnterpriseLmsProctoredExam.IUpdate;

  const updatedProctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.guest.assessments.proctoredExams.update(
      connection,
      {
        assessmentId,
        proctoredExamId,
        body: proctoredExamUpdateBody,
      },
    );
  typia.assert(updatedProctoredExam);

  TestValidator.equals(
    "proctored exam status",
    updatedProctoredExam.status,
    proctoredExamUpdateBody.status,
  );
  TestValidator.equals(
    "proctored exam scheduled_at",
    updatedProctoredExam.scheduled_at,
    proctoredExamUpdateBody.scheduled_at,
  );
  TestValidator.equals(
    "proctored exam exam_session_id",
    updatedProctoredExam.exam_session_id,
    proctoredExamUpdateBody.exam_session_id,
  );
}
