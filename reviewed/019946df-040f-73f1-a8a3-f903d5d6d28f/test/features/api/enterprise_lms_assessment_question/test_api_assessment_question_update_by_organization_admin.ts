import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_assessment_question_update_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register as organizationAdmin
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `orgadmin+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminCreateBody = {
    tenant_id: tenantId,
    email: email,
    password: "StrongP@ssw0rd",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const createdAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(createdAdmin);

  // 2. Login as organizationAdmin
  const loginBody = {
    email: email,
    password: "StrongP@ssw0rd",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const loggedInAdmin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInAdmin);

  // 3. Generate assessmentId and questionId (pretend these exist for update target)
  const assessmentId = typia.random<string & tags.Format<"uuid">>();
  const questionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare update payload for question
  const updatePayload = {
    question_text: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    question_type: RandomGenerator.pick([
      "multiple choice",
      "true/false",
      "essay",
      "practical",
    ] as const),
    weight: Number((Math.random() * 10).toFixed(2)),
  } satisfies IEnterpriseLmsAssessmentQuestion.IUpdate;

  // 5. Execute update
  const updatedQuestion =
    await api.functional.enterpriseLms.organizationAdmin.assessments.questions.update(
      connection,
      {
        assessmentId: assessmentId,
        questionId: questionId,
        body: updatePayload,
      },
    );
  typia.assert(updatedQuestion);

  // 6. Validate updated fields
  TestValidator.equals(
    "Updated question_text",
    updatedQuestion.question_text,
    updatePayload.question_text,
  );
  TestValidator.equals(
    "Updated question_type",
    updatedQuestion.question_type,
    updatePayload.question_type,
  );
  TestValidator.equals(
    "Updated weight",
    updatedQuestion.weight,
    updatePayload.weight,
  );
  TestValidator.equals(
    "assessmentId unchanged",
    updatedQuestion.assessment_id,
    assessmentId,
  );

  // 7. Validate required fields existence and proper formats
  typia.assert<string & tags.Format<"uuid">>(updatedQuestion.id);
  typia.assert<string & tags.Format<"date-time">>(updatedQuestion.created_at);
  typia.assert<string & tags.Format<"date-time">>(updatedQuestion.updated_at);
  if (
    updatedQuestion.deleted_at !== null &&
    updatedQuestion.deleted_at !== undefined
  ) {
    typia.assert<string & tags.Format<"date-time">>(updatedQuestion.deleted_at);
  }
}
