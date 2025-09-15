import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Create a new Department Manager user within the tenant organization.
 *
 * This operation inserts a new record into enterprise_lms_departmentmanager
 * according to the Prisma schema.
 *
 * It ensures email uniqueness scoped to the tenant and assigns status "active".
 *
 * The authenticated departmentManager is used to determine tenant scope.
 *
 * Password is stored as password_hash using secure hashing.
 *
 * @param props - Contains authenticated departmentManager and creation details.
 * @param props.departmentManager - Authenticated departmentManager payload.
 * @param props.body - Data required to create a new Department Manager.
 * @returns The created Department Manager entity including timestamps.
 * @throws {Error} When email already exists in the tenant.
 */
export async function postenterpriseLmsDepartmentManagerDepartmentmanagers(props: {
  departmentManager: DepartmentmanagerPayload;
  body: IEnterpriseLmsDepartmentManager.ICreate;
}): Promise<IEnterpriseLmsDepartmentManager> {
  const { departmentManager, body } = props;

  // Fetch tenant_id associated with authenticated departmentManager
  const currentUser =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUniqueOrThrow({
      where: { id: departmentManager.id },
    });

  // Check email uniqueness scoped to tenant
  const existing =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findFirst({
      where: {
        email: body.email,
        tenant_id: currentUser.tenant_id,
        deleted_at: null,
      },
    });

  if (existing) {
    throw new Error(
      `Department Manager with email ${body.email} already exists in this tenant.`,
    );
  }

  // Hash the password
  const password_hash = await MyGlobal.password.hash(body.password);

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create new Department Manager
  const created = await MyGlobal.prisma.enterprise_lms_departmentmanager.create(
    {
      data: {
        id: v4(),
        tenant_id: currentUser.tenant_id,
        email: body.email,
        password_hash: password_hash,
        first_name: body.first_name,
        last_name: body.last_name,
        status: "active",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Return result converting dates appropriately
  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
