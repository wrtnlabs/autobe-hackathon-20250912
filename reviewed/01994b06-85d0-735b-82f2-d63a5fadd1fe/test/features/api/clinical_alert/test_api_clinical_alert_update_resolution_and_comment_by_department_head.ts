import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformClinicalAlert";

/**
 * Validate the update-resolve workflow for a clinical alert by a department
 * head, including all authorization, field updates, audit verifications, and
 * business-error pathways when attempting redundant updates on a resolved
 * alert.
 *
 * 1. Register a new department head account (join)
 * 2. Login as that department head
 * 3. Locate an unresolved clinical alert (using index endpoint, status 'new')
 * 4. Resolve the alert: update status to 'resolved' and provide a resolution
 *    comment in detail
 * 5. Retrieve the alert to verify the resolution and comment were applied
 * 6. Attempt a further update after resolution and verify an error is thrown
 *    (business logic error)
 */
export async function test_api_clinical_alert_update_resolution_and_comment_by_department_head(
  connection: api.IConnection,
) {
  // 1. Register department head
  const join_request = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
    sso_provider: undefined,
    sso_provider_key: undefined,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const join_result = await api.functional.auth.departmentHead.join(
    connection,
    { body: join_request },
  );
  typia.assert(join_result);

  // 2. Login
  const login_result = await api.functional.auth.departmentHead.login(
    connection,
    {
      body: {
        email: join_request.email,
        password: join_request.password,
        sso_provider: undefined,
        sso_provider_key: undefined,
      } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
    },
  );
  typia.assert(login_result);

  // 3. Find a clinical alert (preferably 'new' status)
  const page: IPageIHealthcarePlatformClinicalAlert =
    await api.functional.healthcarePlatform.departmentHead.clinicalAlerts.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 1 as number & tags.Type<"int32">,
          status: "new",
        },
      },
    );
  typia.assert(page);
  TestValidator.predicate("alert exists for resolution", page.data.length > 0);
  const alert = page.data[0];

  // 4. Resolve the alert: update status and add detail
  const resolution_comment = RandomGenerator.paragraph({ sentences: 5 });
  const resolved_at = new Date().toISOString();
  const update_body = {
    status: "resolved",
    detail: resolution_comment,
    resolved_at,
  } satisfies IHealthcarePlatformClinicalAlert.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.departmentHead.clinicalAlerts.update(
      connection,
      {
        alertId: alert.id,
        body: update_body,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "alert status updated to resolved",
    updated.status,
    "resolved",
  );
  TestValidator.equals(
    "alert detail updated with comment",
    updated.detail,
    resolution_comment,
  );
  TestValidator.equals(
    "resolved_at set correctly",
    updated.resolved_at,
    resolved_at,
  );

  // 5. Retrieve and verify
  const reloaded =
    await api.functional.healthcarePlatform.departmentHead.clinicalAlerts.at(
      connection,
      { alertId: alert.id },
    );
  typia.assert(reloaded);
  TestValidator.equals(
    "reloaded status is resolved",
    reloaded.status,
    "resolved",
  );
  TestValidator.equals(
    "reloaded detail matches comment",
    reloaded.detail,
    resolution_comment,
  );
  TestValidator.equals(
    "reloaded resolved_at is correct",
    reloaded.resolved_at,
    resolved_at,
  );

  // 6. Attempt update after resolution (should error)
  await TestValidator.error(
    "further update on resolved alert must fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.clinicalAlerts.update(
        connection,
        {
          alertId: alert.id,
          body: {
            detail: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IHealthcarePlatformClinicalAlert.IUpdate,
        },
      );
    },
  );
}
