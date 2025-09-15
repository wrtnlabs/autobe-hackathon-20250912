import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPathItem";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

export async function test_api_learning_path_item_deletion_by_department_manager(
  connection: api.IConnection,
) {
  // 1. SystemAdmin user signs up
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        password_hash: "hashedpassword123",
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 2. SystemAdmin login
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: "hashedpassword123",
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 3. Create tenant by systemAdmin
  const tenantCode = RandomGenerator.alphaNumeric(8);
  const tenantName = RandomGenerator.name(2);
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    });
  typia.assert(tenant);

  // 4. CorporateLearner user joins
  const corporateLearnerEmail = typia.random<string & tags.Format<"email">>();
  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        email: corporateLearnerEmail,
        password: "password123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        tenant_id: tenant.id,
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(corporateLearner);

  // 5. CorporateLearner login
  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: corporateLearnerEmail,
      password: "password123",
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 6. Create Learning Path by CorporateLearner
  const learningPathTitle = RandomGenerator.name(3);
  const learningPathCode = RandomGenerator.alphaNumeric(6);
  const learningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          code: learningPathCode,
          title: learningPathTitle,
          description: null,
          status: "active",
        } satisfies IEnterpriseLmsLearningPaths.ICreate,
      },
    );
  typia.assert(learningPath);

  // 7. ContentCreatorInstructor user joins
  const contentCreatorEmail = typia.random<string & tags.Format<"email">>();
  const contentCreator: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        email: contentCreatorEmail,
        tenant_id: tenant.id,
        password_hash: "hashedpassword123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreator);

  // 8. ContentCreatorInstructor login
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: contentCreatorEmail,
      password: "hashedpassword123",
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 9. Create Learning Path Item under Learning Path
  const learningPathItemInput = {
    learning_path_id: learningPath.id,
    item_type: "course",
    item_id: typia.random<string & tags.Format<"uuid">>(),
    sequence_order: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
  } satisfies IEnterpriseLmsLearningPathItem.ICreate;

  const learningPathItem: IEnterpriseLmsLearningPathItem =
    await api.functional.enterpriseLms.contentCreatorInstructor.learningPaths.learningPathItems.create(
      connection,
      {
        learningPathId: learningPath.id,
        body: learningPathItemInput,
      },
    );
  typia.assert(learningPathItem);

  // 10. DepartmentManager user joins
  const deptManagerEmail = typia.random<string & tags.Format<"email">>();
  const deptManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: deptManagerEmail,
        password: "password123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(deptManager);

  // 11. DepartmentManager login
  await api.functional.auth.departmentManager.login(connection, {
    body: {
      email: deptManagerEmail,
      password: "password123",
    } satisfies IEnterpriseLmsDepartmentManager.ILogin,
  });

  // 12. Delete the learning path item by department manager
  await api.functional.enterpriseLms.departmentManager.learningPaths.learningPathItems.eraseLearningPathItem(
    connection,
    {
      learningPathId: learningPath.id,
      learningPathItemId: learningPathItem.id,
    },
  );

  // 13. Attempt to delete again - expect error
  await TestValidator.error(
    "deleting non-existent learning path item should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.learningPaths.learningPathItems.eraseLearningPathItem(
        connection,
        {
          learningPathId: learningPath.id,
          learningPathItemId: learningPathItem.id,
        },
      );
    },
  );
}
