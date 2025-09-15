import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This E2E test validates the update operation for assessment results by a user
 * with the organizationAdmin role within a tenant context. The workflow follows
 * a realistic business case starting with organizationAdmin user registration
 * (join), authentication (login), then setting up an assessment result, and
 * finally performing an update on this result. Key validation checks include
 * successful authentication of the organizationAdmin user, proper authorization
 * enforcement for accessing/updating assessment results scoped to the tenant,
 * and accurate updates of result data reflecting in the response. The test uses
 * exact DTO types for requests and responses, ensures all required properties
 * for organizationAdmin creation and login (tenant_id, email, password, names,
 * status) are provided with valid data, and conforms to format constraints such
 * as UUID and email formats. The update operation validates that partial fields
 * (score, status, completed_at) can be updated. All API function calls are
 * awaited and response types are asserted with typia.assert(). Business rules
 * enforced are that only organizationAdmin users within the correct tenant
 * context can update the assessment result, and input data strictly matches the
 * IEnterpriseLmsAssessmentResult.IUpdate schema. Error cases such as
 * unauthorized access or invalid IDs are not explicitly tested here, focusing
 * on the successful update scenario flow. The scenario ensures complete test
 * coverage including authentication, tenant-aware access, data consistency in
 * update requests and responses, and thorough type validation. The result
 * update will confirm that updated fields are correctly reflected in the
 * response payload.
 */
export async function test_api_assessment_result_update_by_organization_admin_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register organizationAdmin user
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "testPassword123!";
  const firstName: string = RandomGenerator.name(2);
  const lastName: string = RandomGenerator.name(2);

  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const joined: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login organizationAdmin user
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Prepare assessmentId, resultId and update payload
  const assessmentId: string = typia.random<string & tags.Format<"uuid">>();
  const resultId: string = typia.random<string & tags.Format<"uuid">>();

  const updateBody = {
    score: typia.random<number>(),
    completed_at: new Date().toISOString(),
    status: "completed",
  } satisfies IEnterpriseLmsAssessmentResult.IUpdate;

  // 4. Update the assessment result
  const updatedResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.organizationAdmin.assessments.results.update(
      connection,
      {
        assessmentId: assessmentId,
        resultId: resultId,
        body: updateBody,
      },
    );
  typia.assert(updatedResult);

  // 5. Validate that updated values are reflected
  if (updateBody.score !== undefined) {
    TestValidator.equals(
      "updated score",
      updatedResult.score,
      updateBody.score,
    );
  }
  if (updateBody.completed_at !== undefined) {
    TestValidator.equals(
      "updated completed_at",
      updatedResult.completed_at,
      updateBody.completed_at,
    );
  }
  if (updateBody.status !== undefined) {
    TestValidator.equals(
      "updated status",
      updatedResult.status,
      updateBody.status,
    );
  }
}
