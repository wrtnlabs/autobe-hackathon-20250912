import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";

export async function test_api_retrieve_proctored_exam_details_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Creating an organization admin user with tenant-scoped permissions
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `orgadmin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = "password123";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Authenticating as the organization admin user
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Preparing UUIDs for assessment and proctored exam
  const assessmentId = typia.random<string & tags.Format<"uuid">>();
  const proctoredExamId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieving details of the proctored exam
  const proctoredExam: IEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.organizationAdmin.assessments.proctoredExams.at(
      connection,
      {
        assessmentId: assessmentId,
        proctoredExamId: proctoredExamId,
      },
    );

  // 5. Validating the response with typia
  typia.assert(proctoredExam);

  // 6. Further validation of returned fields
  TestValidator.predicate(
    "proctored exam id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      proctoredExam.id,
    ),
  );
  TestValidator.equals(
    "assessmentId matches",
    proctoredExam.assessment_id,
    assessmentId,
  );
  TestValidator.predicate(
    "exam_session_id is non-empty",
    typeof proctoredExam.exam_session_id === "string" &&
      proctoredExam.exam_session_id.length > 0,
  );
  TestValidator.predicate(
    "status is valid",
    ["scheduled", "in_progress", "completed", "cancelled"].includes(
      proctoredExam.status,
    ),
  );
  if (
    proctoredExam.proctor_id !== undefined &&
    proctoredExam.proctor_id !== null
  ) {
    TestValidator.predicate(
      "proctor_id is uuid if provided",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        proctoredExam.proctor_id,
      ),
    );
  }
  if (
    proctoredExam.deleted_at !== undefined &&
    proctoredExam.deleted_at !== null
  ) {
    TestValidator.predicate(
      "deleted_at is ISO date-time if provided",
      typeof proctoredExam.deleted_at === "string" &&
        proctoredExam.deleted_at.length > 0,
    );
  }
}
